# TRANSFORM-NOTES.md

Scoring formula:
observability_score = website + news + directory + contact

Weights:
- website_presence: none=0, basic=20, strong=35
- news_signal_12m: unknown=4, low=8, medium=16, high=25
- directory_presence: none=0, low=8, medium=14, high=20
- contact_discoverability: low=5, medium=12, high=20

Unknown policy: applied for news when no direct 12-month signal exists in round-1 artifacts.
