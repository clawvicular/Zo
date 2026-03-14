"""EvoChat Core - Evolutionary Idea Generator"""
import time
import json
import os
import re
from datetime import timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

# Persistent state
STATE_FILE = "evochat_state.json"
RESULTS_LOG = "results.log"
DASHBOARD = "EvoChat_Dashboard.html"
ARTIFACTS_DIR = "artifacts"

@dataclass
class ExperimentResult:
    iteration: int
    score: float
    runtime: float
    artifact_path: str
    timestamp: str
    goal: str
    scaffolding: str
    ideas: List[str]

def load_state() -> Dict[str, Any]:
    """Load persistent state from file."""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {
        "start_time": time.monotonic(),
        "max_seconds": 3600,
        "exp_seconds": 300,
        "best_score": 0,
        "iterations": 0,
        "goal": "",
        "scaffolding": "",
        "results": []
    }

def save_state(state: Dict[str, Any]) -> None:
    """Save state to file."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def parse_time_params(user_input: str) -> tuple:
    """Parse natural language input for time parameters and goal."""
    goal = user_input
    max_min = 60
    exp_min = 5
    
    # Parse max session time
    hour_match = re.search(r'(\d+)\s*(?:hour|hr)', user_input, re.I)
    min_max_match = re.search(r'(\d+)\s*min.*?(?:max|session)', user_input, re.I)
    
    if hour_match:
        max_min = int(hour_match.group(1)) * 60
    elif min_max_match:
        max_min = int(min_max_match.group(1))
    
    # Parse experiment duration
    exp_match = re.search(r'(\d+)\s*min.*?(?:experiment|exp)', user_input, re.I)
    if exp_match:
        exp_min = int(exp_match.group(1))
    
    # Extract clean goal - remove time params
    goal = re.sub(r'(,\s*)?(\d+\s*(?:hour|hr|min).*?(?:max|session|experiment|exp))', '', goal, flags=re.I).strip()
    goal = re.sub(r'^\d+\s*(?:hour|hr|min).*?(?:max|session|experiment|exp)[,\s]*', '', goal, flags=re.I).strip()
    goal = goal.strip('.,;:')
    
    return goal, max_min * 60, exp_min * 60
