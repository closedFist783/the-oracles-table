export default function Landing({ onSignIn, onSignUp }) {
  return (
    <div className="landing">
      {/* Hero */}
      <header className="landing-hero">
        <div className="landing-logo">⚔️</div>
        <h1 className="landing-title">The Oracle's Table</h1>
        <p className="landing-tagline">A solo tabletop adventure unlike anything you've played before.</p>
        <div className="landing-ctas">
          <button className="btn btn-primary btn-lg" onClick={onSignUp}>Begin Your Adventure</button>
          <button className="btn btn-ghost btn-lg" onClick={onSignIn}>Sign In</button>
        </div>
      </header>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-feature">
          <div className="feat-icon">🧙</div>
          <h3>Your Story, Your Rules</h3>
          <p>Create a unique character from 12 classes and 9 races. Every choice shapes the world around you.</p>
        </div>
        <div className="landing-feature">
          <div className="feat-icon">🎲</div>
          <h3>True D&amp;D 5e Rules</h3>
          <p>Real dice rolls, saving throws, ability checks, hit dice, and AC calculations — all running under the hood.</p>
        </div>
        <div className="landing-feature">
          <div className="feat-icon">📜</div>
          <h3>Living Quests &amp; NPCs</h3>
          <p>The world remembers who you've met and what you've done. Allies, enemies, and storylines that evolve.</p>
        </div>
        <div className="landing-feature">
          <div className="feat-icon">⚗️</div>
          <h3>Full Character Sheet</h3>
          <p>Track HP, XP, inventory, spells, skills, and saving throws — all in one place as you level up.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-steps">
        <h2>How It Works</h2>
        <div className="steps-row">
          <div className="step">
            <div className="step-num">1</div>
            <p>Create your character — pick your race, class, and backstory</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">2</div>
            <p>Enter your adventure — the world reacts to every decision you make</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">3</div>
            <p>Level up, gather gear, complete quests, and shape your legend</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-final-cta">
        <h2>Your adventure begins with a single step.</h2>
        <button className="btn btn-primary btn-lg" onClick={onSignUp}>Create a Free Account</button>
      </section>

      <footer className="landing-footer">
        <span>© 2025 The Oracle's Table</span>
        <button className="btn btn-ghost btn-sm" onClick={onSignIn}>Sign In</button>
      </footer>
    </div>
  )
}
