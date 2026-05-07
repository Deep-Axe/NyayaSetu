from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import re

def parse_relative_date(base_date, expression):
    """
    Parses expressions like 'within six weeks' or '30 days' and returns the absolute date.
    """
    expression = expression.lower()
    
    # Simple regex for common patterns
    match = re.search(r'(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|week|month)', expression)
    if not match:
        return base_date + timedelta(days=30) # Default fallback
    
    num_str, unit = match.groups()
    
    # Word to number mapping
    word_to_num = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    }
    
    num = int(num_str) if num_str.isdigit() else word_to_num.get(num_str, 1)
    
    if 'day' in unit:
        return base_date + timedelta(days=num)
    elif 'week' in unit:
        return base_date + timedelta(weeks=num)
    elif 'month' in unit:
        return base_date + relativedelta(months=num)
    
    return base_date

def compute_deadlines(extraction_result):
    """
    Computes absolute deadlines for all directions and the appeal window.
    """
    order_date = extraction_result.get("order_date")
    if not order_date:
        base_date = datetime.today().date()
    elif isinstance(order_date, dict):
        base_date = datetime.strptime(order_date.get("value", str(datetime.today().date())), "%Y-%m-%d").date()
    else:
        # Handling string
        try:
            base_date = datetime.strptime(order_date, "%Y-%m-%d").date()
        except ValueError:
            base_date = datetime.today().date()

    # Appeal Window Calculation
    # High Court -> Supreme Court: 90 days
    # District Court -> High Court: 30 days (simplified for now)
    limitation_days = 90 if "High Court" in extraction_result.get("court", "High Court") else 30
    extraction_result["appeal_deadline"] = base_date + timedelta(days=limitation_days)
    
    for direction in extraction_result.get("directions", []):
        if "deadline" in direction and direction["deadline"]:
            d = direction["deadline"]
            if d.get("type") == "inferred":
                d["computed"] = parse_relative_date(base_date, d.get("expression", ""))
            else:
                # Explicit date
                d["computed"] = d.get("value")
    
    return extraction_result
