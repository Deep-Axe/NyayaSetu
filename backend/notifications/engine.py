import time
import logging
from collections import deque
from datetime import date, timedelta
from azure.communication.email import EmailClient
from backend.config import ACS_CONNECTION_STRING, ACS_SENDER_ADDRESS

logger = logging.getLogger(__name__)

# ACS free tier limits: 5 sends/min, 10 sends/hour
_LIMIT_PER_MIN = 5
_LIMIT_PER_HOUR = 10

# Sliding-window rate limiter — stores epoch timestamps of recent sends
_send_times: deque = deque()

_client = EmailClient.from_connection_string(ACS_CONNECTION_STRING)


def _within_rate_limit() -> bool:
    now = time.time()
    # Evict timestamps older than 1 hour
    while _send_times and _send_times[0] < now - 3600:
        _send_times.popleft()

    hourly = len(_send_times)
    minutely = sum(1 for t in _send_times if t >= now - 60)

    if hourly >= _LIMIT_PER_HOUR:
        logger.warning("Email rate limit hit: %d sent in last hour (max %d)", hourly, _LIMIT_PER_HOUR)
        return False
    if minutely >= _LIMIT_PER_MIN:
        logger.warning("Email rate limit hit: %d sent in last minute (max %d)", minutely, _LIMIT_PER_MIN)
        return False
    return True


def send_email_notification(to_email: str, subject: str, body_text: str, body_html: str = "") -> bool:
    """
    Send a single email via Azure Communication Services.
    Returns True on success, False if rate-limited or failed.
    """
    if not _within_rate_limit():
        return False

    message = {
        "senderAddress": ACS_SENDER_ADDRESS,
        "recipients": {
            "to": [{"address": to_email}]
        },
        "content": {
            "subject": subject,
            "plainText": body_text,
            "html": body_html or f"<html><body><p>{body_text}</p></body></html>",
        },
    }

    try:
        poller = _client.begin_send(message)
        result = poller.result()
        _send_times.append(time.time())
        logger.info("Email sent to %s — message id: %s", to_email, result.get("id"))
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False


def check_and_notify_deadlines(db_session) -> dict:
    """
    Scans VERIFIED cases and sends deadline reminder emails.
    Called from a scheduled job or on demand.

    Notification windows: 30 days, 14 days, 7 days before deadline,
    and immediately when already past deadline (contempt risk).
    """
    from backend.db.models import Case, CaseState, NotificationLog

    today = date.today()
    thresholds = [30, 14, 7]
    sent = 0
    skipped = 0

    verified_cases = db_session.query(Case).filter(
        Case.lifecycle_state == CaseState.VERIFIED,
        Case.deadline.isnot(None),
    ).all()

    for case in verified_cases:
        days_left = (case.deadline - today).days

        if days_left < 0:
            trigger = "CONTEMPT_RISK"
            subject = f"[NyayaSetu] URGENT — Deadline Passed: {case.case_id}"
            body = (
                f"Case {case.case_id} had a compliance deadline of {case.deadline} "
                f"which has now passed ({abs(days_left)} days ago). "
                f"Immediate action is required to avoid contempt of court."
            )
        elif days_left in thresholds:
            trigger = f"DEADLINE_{days_left}D"
            subject = f"[NyayaSetu] Reminder — {days_left} days to deadline: {case.case_id}"
            body = (
                f"Case {case.case_id} has a compliance deadline on {case.deadline} "
                f"({days_left} days from today). Please take the required action."
            )
        else:
            continue

        # Avoid duplicate notifications for the same case+trigger on the same day
        already_sent = db_session.query(NotificationLog).filter(
            NotificationLog.case_id == case.id,
            NotificationLog.trigger_event == trigger,
        ).order_by(NotificationLog.sent_at.desc()).first()

        if already_sent and already_sent.sent_at.date() == today:
            skipped += 1
            continue

        recipient = "ahuja.deepam@gmail.com"  # replace with real dept contact lookup
        success = send_email_notification(recipient, subject, body)

        if success:
            log = NotificationLog(
                case_id=case.id,
                trigger_event=trigger,
                sent_to=recipient,
            )
            db_session.add(log)
            db_session.commit()
            sent += 1
        else:
            # Rate limit hit — stop processing remaining cases this run
            logger.warning("Rate limit reached during deadline scan; stopping early")
            break

    return {"sent": sent, "skipped": skipped}
