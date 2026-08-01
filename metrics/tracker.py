def calculate_repo_score(stars, forks, commits):
    return (stars * 3) + (forks * 5) + commits
