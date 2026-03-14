"""EvoChat Experiment - Run experiments and create artifacts"""
import time
import json
import os
from typing import Optional, List
from datetime import timedelta
from evochat_generator import generate_ideas, evaluate_ideas
from evochat_core import ExperimentResult, ARTIFACTS_DIR

def run_experiment(scaffolding: str, goal: str, exp_seconds: int, iteration: int) -> ExperimentResult:
    """Run a single experiment iteration."""
    start_exp = time.monotonic()
    
    ideas = generate_ideas(goal, scaffolding, iteration)
    score = evaluate_ideas(ideas, goal)
    
    runtime = time.monotonic() - start_exp
    actual_work_time = min(2, exp_seconds)
    time.sleep(max(0, actual_work_time - runtime))
    
    artifact_path = _create_artifact(goal, ideas, iteration, score)
    
    return ExperimentResult(
        iteration=iteration + 1,
        score=score,
        runtime=time.monotonic() - start_exp,
        artifact_path=artifact_path,
        timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
        goal=goal,
        scaffolding=scaffolding,
        ideas=ideas
    )

def _create_artifact(goal: str, ideas: List[str], iteration: int, score: float) -> str:
    """Create a downloadable artifact with the generated ideas."""
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    
    timestamp = int(time.time())
    filename = f"evochat_{iteration:03d}_{timestamp}.json"
    filepath = os.path.join(ARTIFACTS_DIR, filename)
    
    artifact = {
        "goal": goal,
        "iteration": iteration,
        "score": score,
        "ideas": ideas,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open(filepath, "w") as f:
        json.dump(artifact, f, indent=2)
    
    return filepath
