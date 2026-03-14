"""EvoChat - Main entry point"""
import time
from evochat_core import load_state, save_state, parse_time_params
from evochat_experiment import run_experiment
from evochat_dashboard import update_dashboard
from evochat_generator import generate_ideas, evaluate_ideas

RESULTS_LOG = "results.log"

def log_result(result):
    """Append result to log file."""
    import json
    from dataclasses import asdict
    with open(RESULTS_LOG, "a") as f:
        f.write(json.dumps(asdict(result)) + "\n")

def run(user_msg: str = None):
    """Main run loop."""
    state = load_state()
    
    # First run - parse user message
    if "goal" not in state or state["goal"] == "":
        if user_msg is None:
            user_msg = "build me a viral TikTok idea generator that actually makes money, 1 hour max session, 5 minute experiments"
        
        state["goal"], state["max_seconds"], state["exp_seconds"] = parse_time_params(user_msg)
        state["start_time"] = time.time()
        save_state(state)
        print(f"Starting EvoChat with goal: {state['goal']}")
        print(f"Max session: {state['max_seconds']}s, Experiment: {state['exp_seconds']}s")
    
    # Check time limit
    elapsed = time.time() - state["start_time"]
    if elapsed >= state["max_seconds"]:
        print("Session time limit reached! Final products ready.")
        update_dashboard(state)
        return
    
    # Run one experiment
    iteration = state["iterations"]
    result = run_experiment(state.get("scaffolding", ""), state["goal"], state["exp_seconds"], iteration)
    
    state["iterations"] += 1
    state["results"] = state.get("results", [])
    state["results"].append({
        "iteration": result.iteration,
        "score": result.score,
        "runtime": result.runtime,
        "artifact_path": result.artifact_path,
        "timestamp": result.timestamp,
        "goal": result.goal,
        "scaffolding": result.scaffolding,
        "ideas": result.ideas
    })
    
    if result.score > state["best_score"]:
        state["best_score"] = result.score
        state["scaffolding"] = f"Iteration {result.iteration} best"
        print(f"New best! Score: {result.score}")
        print(f"Ideas: {result.ideas[:3]}")
        print(f"Download: {result.artifact_path}")
    
    save_state(state)
    update_dashboard(state, result)
    
    remaining = state["max_seconds"] - (time.time() - state["start_time"])
    print(f"Experiment {state['iterations']} complete. Time left: {int(remaining)}s")

if __name__ == "__main__":
    run()
