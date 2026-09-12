// Scores come only from the judge's private feedback. No partial-round average.
export function judgedRounds(manifest, readReview) {
  let streak = 0, achieved = false, gap = false;
  const rounds = (manifest?.rounds || []).map(round => {
    const scores = round.members.map(member => {
      const value = readReview(member.candidateId);
      return value?.imageHash === member.imageHash && Number.isInteger(value.score)
        && value.score >= 1 && value.score <= 10 ? value.score : null;
    });
    const rated = scores.filter(score => score !== null).length;
    const complete = rated === 5 && round.members.length === 5;
    const mean = complete ? scores.reduce((a, b) => a + b, 0) / 5 : null;
    if (complete) {
      if (gap) streak = 0;
      streak = mean >= manifest.targetMean ? streak + 1 : 0;
      gap = false;
      achieved ||= streak >= manifest.targetConsecutiveRounds;
    } else gap = true;
    return {...round, scores, rated, complete, mean};
  });
  return {rounds, streak, achieved};
}
