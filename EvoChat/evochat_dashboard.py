"""EvoChat Dashboard - HTML dashboard generator"""
import json
from datetime import timedelta
from typing import Dict, Any, Optional, List

def update_dashboard(state: Dict[str, Any], result: Optional[Any] = None) -> str:
    """Generate an interactive HTML dashboard."""
    elapsed = time.monotonic() - state["start_time"]
    remaining = max(0, state["max_seconds"] - elapsed)
    
    results = state.get("results", [])
    iterations = [r["iteration"] for r in results]
    scores = [r["score"] for r in results]
    
    best_result = None
    if results:
        best_result = max(results, key=lambda x: x["score"])
    
    avg_score = sum(scores) / len(scores) if scores else 0
    
    # Build best ideas HTML
    best_ideas_html = ""
    if best_result:
        ideas_li = "".join([f'<li class="text-gray-200">• {idea}</li>' for idea in best_result["ideas"]])
        best_ideas_html = f'''
        <div class="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-xl p-6 mb-8 backdrop-blur border border-green-500/30">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-green-400">Best Result</h3>
                <span class="bg-green-500/20 text-green-400 px-3 py-1 rounded-full">Score: {best_result["score"]:.1f}</span>
            </div>
            <div class="text-sm text-gray-300 mb-2">Iteration {best_result["iteration"]} - {best_result["timestamp"]}</div>
            <ul class="space-y-2">{ideas_li}</ul>
        </div>'''
    
    # Build recent results
    recent_html = ""
    for r in reversed(results[-10:]):
        is_best = 'text-green-400' if r['score'] == state['best_score'] else 'text-gray-300'
        recent_html += f'''
        <div class="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
            <div>
                <span class="text-gray-400">Iteration {r["iteration"]}</span>
                <span class="ml-3 text-sm text-gray-500">{r["timestamp"]}</span>
            </div>
            <span class="{is_best} font-semibold">{r["score"]:.1f}</span>
        </div>'''
    
    chart_labels = json.dumps([f"I{i}" for i in iterations])
    chart_scores = json.dumps(scores)
    chart_improvement = json.dumps([s - scores[0] if scores else 0 for s in scores])
    
    max_score_idx = scores.index(max(scores)) if scores else 0
    bar_colors = json.dumps(['#22c55e' if i == max_score_idx else '#3b82f6' for i in range(len(scores))])
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EvoChat Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
        .gradient-bg {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); }}
    </style>
</head>
<body class="gradient-bg min-h-screen text-white">
    <div class="container mx-auto px-4 py-8">
        <div class="text-center mb-8">
            <h1 class="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">EvoChat</h1>
            <p class="text-gray-400">Evolutionary Idea Generator</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-gray-800/50 rounded-xl p-6 backdrop-blur">
                <div class="text-gray-400 text-sm">Time Remaining</div>
                <div class="text-4xl font-bold text-purple-400" id="countdown">{str(timedelta(seconds=int(remaining)))}</div>
            </div>
            <div class="bg-gray-800/50 rounded-xl p-6 backdrop-blur">
                <div class="text-gray-400 text-sm">Iterations</div>
                <div class="text-4xl font-bold text-pink-400">{state["iterations"]}</div>
            </div>
            <div class="bg-gray-800/50 rounded-xl p-6 backdrop-blur">
                <div class="text-gray-400 text-sm">Best Score</div>
                <div class="text-4xl font-bold text-green-400">{state["best_score"]:.1f}</div>
            </div>
            <div class="bg-gray-800/50 rounded-xl p-6 backdrop-blur">
                <div class="text-gray-400 text-sm">Avg Score</div>
                <div class="text-4xl font-bold text-blue-400">{avg_score:.1f}</div>
            </div>
        </div>
        
        <div class="bg-gray-800/50 rounded-xl p-6 mb-8 backdrop-blur">
            <div class="text-gray-400 text-sm mb-2">Current Goal</div>
            <div class="text-xl font-semibold">{state["goal"]}</div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-gray-800/50 rounded-xl p-6 backdrop-blur">
                <h3 class="text-lg font-semibold mb-4">Score Progress</h3>
                <canvas id="scoreChart"></canvas>
            </div>
            <div class="bg-gray-800/50 rounded-xl p-6 backdrop-blur">
                <h3 class="text-lg font-semibold mb-4">Improvement</h3>
                <canvas id="improvementChart"></canvas>
            </div>
        </div>
        
        {best_ideas_html}
        
        <div class="bg-gray-800/50 rounded-xl p-6 backdrop-blur">
            <h3 class="text-lg font-semibold mb-4">Recent Iterations</h3>
            <div class="space-y-3 max-h-64 overflow-y-auto">{recent_html}</div>
        </div>
        
        <div class="text-center mt-8 text-gray-500 text-sm">EvoChat v1.0 | Auto-refreshes every 10 seconds</div>
    </div>
    
    <script>
        new Chart(document.getElementById('scoreChart'), {{
            type: 'line',
            data: {{
                labels: {chart_labels},
                datasets: [{{
                    label: 'Score',
                    data: {chart_scores},
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    fill: true,
                    tension: 0.4
                }}]
            }},
            options: {{
                responsive: true,
                plugins: {{ legend: {{ display: false }} }},
                scales: {{
                    y: {{ min: 0, max: 100, grid: {{ color: 'rgba(255,255,255,0.1)' }} }},
                    x: {{ grid: {{ color: 'rgba(255,255,255,0.1)' }} }}
                }}
            }}
        }});
        
        new Chart(document.getElementById('improvementChart'), {{
            type: 'bar',
            data: {{
                labels: {chart_labels},
                datasets: [{{
                    label: 'Improvement',
                    data: {chart_improvement},
                    backgroundColor: {bar_colors}
                }}]
            }},
            options: {{
                responsive: true,
                plugins: {{ legend: {{ display: false }} }},
                scales: {{
                    y: {{ grid: {{ color: 'rgba(255,255,255,0.1)' }} }},
                    x: {{ grid: {{ color: 'rgba(255,255,255,0.1)' }} }}
                }}
            }}
        }});
        
        setInterval(() => {{
            fetch(window.location.href)
                .then(r => r.text())
                .then(html => {{
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const countdown = doc.getElementById('countdown');
                    if (countdown) {{
                        document.getElementById('countdown').textContent = countdown.textContent;
                    }}
                }})
                .catch(() => {{}});
        }}, 10000);
    </script>
</body>
</html>'''
    
    with open("EvoChat_Dashboard.html", "w") as f:
        f.write(html)
    
    return "EvoChat_Dashboard.html"

import time
