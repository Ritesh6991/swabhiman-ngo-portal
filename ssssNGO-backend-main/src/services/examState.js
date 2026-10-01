const publicExamState = (cycle, now = new Date()) => {
  if (["completed", "archived"].includes(cycle.status)) return "closed";
  if (cycle.status === "draft") return "draft";
  if (now < new Date(cycle.registrationStart)) return "upcoming";
  if (now > new Date(cycle.registrationEnd)) return "closed";
  return "open";
};

const publicCycle = (cycle, now = new Date()) => ({
  id: cycle._id,
  title: cycle.title,
  year: cycle.year,
  slug: cycle.slug,
  registrationStart: cycle.registrationStart,
  registrationEnd: cycle.registrationEnd,
  examDate: cycle.examDate,
  reportingTime: cycle.reportingTime,
  examStartTime: cycle.examStartTime,
  examinationCentre: cycle.examinationCentre,
  instructions: cycle.instructions,
  registrationState: publicExamState(cycle, now),
});

module.exports = { publicExamState, publicCycle };
