import { Reveal } from '../../components/Experience';

export default function GettingStartedPage() {
  return <section className="plain-page"><article className="prose"><Reveal><span className="eyebrow-chip">DOCUMENTATION · GETTING STARTED</span><h1>Start with the bundled fixture.</h1><p>trypatchbay is an early local prototype. There is no hosted workspace, sign-in flow, repository connection or live watcher to configure.</p></Reveal>
    <Reveal delay={80}><h2>Dashboard availability</h2><p>The dashboard route does not load account, fixture, or repository data. Authentication, repository authorization, and persistent workspace state are not implemented.</p></Reveal>
    <Reveal delay={160}><h2>Run the local proof loop</h2><p>From a checkout of this repository, install dependencies and run the bundled fixture proof:</p><pre className="code-sample">npm install<br />npm run prove</pre><p>The command runs local fixtures. It is not sandboxed and does not open or submit pull requests. GitHub PR delivery is not implemented.</p></Reveal>
    <Reveal delay={240}><h2>What is still in development</h2><ul><li>Live provider and repository watching</li><li>Sandboxed execution on user repositories</li><li>Hosted accounts and repository setup</li><li>Pull request delivery</li></ul></Reveal>
  </article></section>;
}
