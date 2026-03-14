# EvoChat

EvoChat is an autonomous experiment runner that iteratively generates, evaluates, and refines ideas to achieve a specified goal. Think of it as having an AI researcher that runs rapid experiments to find solutions to your problems.

## What it does

EvoChat takes a goal (e.g., "build a viral TikTok idea generator") and:
1. Generates candidate ideas/solutions
2. Evaluates each one against the goal
3. Keeps track of results and iterates
4. Continues until time runs out or you stop it

## Project Structure

```
EvoChat/
├── evochat.py              # Main entry point
├── evochat_core.py         # Core utilities (state management)
├── evochat_experiment.py   # Experiment running logic
├── evochat_generator.py    # Idea generation & evaluation
├── evochat_dashboard.py    # Results visualization
├── evochat_state.json      # Persistent state
├── artifacts/              # Generated artifacts from experiments
├── EvoChat_Dashboard.html  # HTML dashboard for viewing results
└── results.log            # Log of all experiment results
```

## Quick Start

```bash
# Run with default goal
python evochat.py

# Run with custom goal and time limits
python evochat.py "build me a viral TikTok idea generator" --max-session 3600 --exp-seconds 300
```

## Configuration

Edit `evochat_state.json` to configure:
- `goal` - What you're trying to achieve
- `max_seconds` - Maximum session time
- `exp_seconds` - Time per experiment
- `scaffolding` - Initial context or approach hints

## Output

- **Dashboard**: Open `EvoChat_Dashboard.html` in a browser to visualize results
- **Artifacts**: Each experiment generates JSON files in `artifacts/`
- **Results Log**: `results.log` contains all experiment scores and runtimes

## How It Works

1. **Initialization**: Parses the goal and time parameters
2. **Iteration Loop**: 
   - Generate a candidate solution/idea
   - Run experiment (limited time)
   - Evaluate result (score, runtime)
   - Save artifact
3. **Dashboard**: Updates after each iteration for real-time monitoring

## Use Cases

- Rapid prototyping and idea testing
- A/B testing different approaches
- Finding optimal configurations
- Generating and evaluating content variations
