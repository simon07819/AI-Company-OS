import { agentSkills } from "@/agents/skills";

export default function SkillsPlatformPage() {
  const skills = Object.keys(agentSkills).slice(0, 12);
  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <span>Skills</span>
        <h1>Agent Skills</h1>
        <p>Bibliothèque des capacités appelables par les agents dans le runtime.</p>
      </header>
      <div className="platform-pill-list">
        {skills.map((skill) => <span key={skill}>{skill}</span>)}
      </div>
    </section>
  );
}
