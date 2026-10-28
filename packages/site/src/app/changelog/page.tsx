import { Reveal } from '../components/Experience';
import { NavyBand, PageHeading } from '../components/PageSections';

const notes = [
  { label: 'CURRENT PROTOTYPE', title: 'Local API change proof loop', body: 'A bundled fixture demonstrates an API parameter rename, local call-site mapping, a deterministic patch and a rerun of the fixture tests.' },
  { label: 'IN DEVELOPMENT', title: 'Live repository watching', body: 'Watching provider releases and connected repositories is not available yet.' },
  { label: 'IN DEVELOPMENT', title: 'Sandboxed runs and pull request delivery', body: 'Isolated repository execution and creating pull requests are still being built.' },
];

export default function ChangelogPage() {
  return <>
    <section className="subpage-hero"><div className="content-width"><PageHeading eyebrow="CHANGELOG" title="Development notes, plainly stated." description="There are no production releases yet. This page summarizes what the prototype contains and what remains in development." /></div></section>
    <section className="section-block content-width changelog-list">{notes.map((note, index) => <Reveal key={note.title} delay={index * 80}><article className="changelog-entry"><span className="small-label">{note.label}</span><h2>{note.title}</h2><p>{note.body}</p></article></Reveal>)}</section>
    <NavyBand title="A prototype, not a hosted service." body="The demo dashboard uses bundled example values and has no live events or connected repositories." cta="Explore the demo" href="/dashboard" />
  </>;
}
