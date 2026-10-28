import { Reveal } from '../../components/Experience';

export default function ConceptsPage() {
  return <section className="plain-page"><article className="prose"><Reveal><span className="eyebrow-chip">DOCUMENTATION · CONCEPTS</span><h1>Three parts of a local proof.</h1><p>The following terms describe the intended workflow and the bundled fixture demo.</p></Reveal>
    <Reveal delay={80}><h2>Change record</h2><p>A description of an API shape change. The prototype uses a recorded fixture rather than a live provider feed.</p></Reveal>
    <Reveal delay={160}><h2>Call-site map</h2><p>A local index of code references that appear to use the changed API shape. The sample map has limited scope and can miss dynamic or indirect usage.</p></Reveal>
    <Reveal delay={240}><h2>Proof</h2><p>A proposed patch plus test output from the bundled fixture. Today this runs locally without sandboxing. Hosted execution and pull request delivery are in development.</p></Reveal>
  </article></section>;
}
