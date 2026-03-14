"""EvoChat Generator - Idea generation logic"""
from typing import List

def generate_ideas(goal: str, scaffolding: str, iteration: int) -> List[str]:
    """Generate ideas based on the goal and current scaffolding."""
    context = f"Goal: {goal}\n"
    if scaffolding:
        context += f"Current approach: {scaffolding}\n"
    context += f"Iteration: {iteration + 1}\n"
    
    if "tiktok" in goal.lower() or "tik tok" in goal.lower():
        ideas = _generate_tiktok_ideas(context, iteration)
    elif "website" in goal.lower() or "web" in goal.lower():
        ideas = _generate_website_ideas(context, iteration)
    elif "app" in goal.lower() or "application" in goal.lower():
        ideas = _generate_app_ideas(context, iteration)
    else:
        ideas = _generate_generic_ideas(context, iteration)
    
    return ideas

def _generate_tiktok_ideas(context: str, iteration: int) -> List[str]:
    """Generate viral TikTok ideas."""
    base_ideas = [
        "AI-powered trend spotter that identifies rising sounds before they go viral",
        "Automated script generator with viral hooks and trending topic integration",
        "Niche-specific content calendar that syncs with optimal posting times",
        "AI dubbing tool for repurposing content across languages and regions",
        "Viral hook library with A/B testing framework for thumbnails",
        "Creator monetization tracker that finds sponsorship opportunities",
        "Trend prediction dashboard using AI to forecast viral potential",
        "Automated short-form video editor with viral templates",
    ]
    
    evolved = []
    for i, idea in enumerate(base_ideas):
        if iteration > 0:
            idea += f" + iteration {iteration} optimization"
        evolved.append(idea)
    
    offset = iteration % len(evolved)
    return evolved[offset:] + evolved[:offset]

def _generate_website_ideas(context: str, iteration: int) -> List[str]:
    return [
        f"Landing page builder with AI-generated copy (v{iteration+1})",
        f"Portfolio site with integrated analytics (v{iteration+1})",
        f"E-commerce store with viral referral system (v{iteration+1})",
        f"Blog with SEO optimization and social sharing (v{iteration+1})",
    ]

def _generate_app_ideas(context: str, iteration: int) -> List[str]:
    return [
        f"Mobile app with push notifications for {iteration+1} use cases",
        f"Cross-platform app with offline-first architecture (v{iteration+1})",
        f"AI-powered personal assistant mobile app (v{iteration+1})",
    ]

def _generate_generic_ideas(context: str, iteration: int) -> List[str]:
    return [f"Creative solution #{i+1} for iteration {iteration+1}" for i in range(5)]

def evaluate_ideas(ideas: List[str], goal: str) -> float:
    """Evaluate ideas and return a score."""
    score = 50.0
    
    for idea in ideas:
        if any(word in idea.lower() for word in ["ai", "automated", "viral", "trend"]):
            score += 5
        if "monetiz" in idea.lower() or "money" in idea.lower() or "revenue" in idea.lower():
            score += 7
        if "generator" in idea.lower() or "tool" in idea.lower():
            score += 3
    
    return min(100, score)
