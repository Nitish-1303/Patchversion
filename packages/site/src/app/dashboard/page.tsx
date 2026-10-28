export default function DashboardPage() {
  return (
    <section className="login-card" aria-labelledby="dashboard-unavailable-title">
      <span className="eyebrow-chip">WORKSPACE UNAVAILABLE</span>
      <h1 id="dashboard-unavailable-title">Dashboard access is not available yet.</h1>
      <p>Authentication, repository authorization, and persistent workspace data have not been implemented.</p>
      <p>No repository, dependency, validation, activity, or pull request data has been loaded.</p>
    </section>
  );
}
