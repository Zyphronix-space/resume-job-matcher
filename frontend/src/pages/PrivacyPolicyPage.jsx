export default function PrivacyPolicyPage() {
  return (
    <section className="legal-page">
      <h1 className="hero-title legal-title">Privacy Policy</h1>
      <p className="legal-updated">Last updated: September 2026</p>

      <p>
        RecruitAI is an independent student portfolio project built and operated by Stephan
        Wasalathanthrige, not a registered company. It's provided to demonstrate a full-stack
        recruiting workspace. This page explains what personal information the site collects,
        why, and what happens to it.
      </p>

      <h2>What information is collected</h2>
      <ul>
        <li><strong>Account information:</strong> full name, email address, a hashed password, and the role you choose at signup (candidate or recruiter).</li>
        <li><strong>Resume files (candidates):</strong> the PDF you upload, and whatever personal details it contains (name, contact details, education, work history).</li>
        <li><strong>Job postings and applications (recruiters):</strong> the job details you create, and notes you leave on candidates.</li>
        <li><strong>Application data (candidates):</strong> cover letters, screening-question answers, and application status you submit through the platform.</li>
        <li><strong>Password reset tokens:</strong> a short-lived token created only when you use "forgot password."</li>
      </ul>

      <h2>Why it's collected</h2>
      <p>
        Solely to operate the matching and recruiting workflow: creating your account, computing
        match scores between resumes and jobs, letting a recruiter review candidates who applied
        to their own postings, and generating the reports you explicitly request (CSV/PDF exports).
        Nothing is collected for advertising or resold to anyone.
      </p>

      <h2>Cookies and similar technologies</h2>
      <p>
        This site does not set or read cookies, and does not use any analytics, advertising, or
        tracking scripts of any kind. It stores exactly two things in your browser's
        localStorage/sessionStorage, both of which stay on your device: your sign-in session
        token (a JWT, required to keep you logged in) and your light/dark theme preference.
        Neither is sent to any third party.
      </p>

      <h2>Third-party services</h2>
      <p>
        None are used. Matching, scoring, and report generation (including PDF export) all run
        inside this application, not through an external analytics, tracking, or AI API. If that
        ever changes, this section will be updated to name the provider and what it receives.
      </p>

      <h2>Who can see your data</h2>
      <p>
        A candidate's resume and derived profile are visible only to that candidate and to a
        recruiter reviewing an application the candidate actually submitted to one of their job
        postings. Job postings are visible to any signed-in candidate browsing that page. Your
        data is never sold, rented, or shared with anyone outside the platform.
      </p>

      <h2>Data retention</h2>
      <p>
        Resumes remain stored until you delete them yourself (Resumes page) or an administrator
        removes the account. There is currently no automatic deletion schedule; if you need a
        specific retention or deletion timeline, contact the operator below.
      </p>

      <h2>Data security</h2>
      <p>
        Passwords are hashed (PBKDF2-HMAC-SHA256) and never stored in plain text. Resume files
        are stored outside any public path and are only ever served through an endpoint that
        checks you're the owner or an authorized recruiter. No system can guarantee perfect
        security, and this remains a personal project rather than an audited production service.
      </p>

      <h2>Your choices</h2>
      <p>
        You can review and update your profile at any time, delete individual resumes yourself,
        and request full account deletion by emailing the operator. There is no self-service
        "delete my account" button yet; deletion requests are handled manually.
      </p>

      <h2>Changes to this policy</h2>
      <p>This page may be updated as the project changes. Check back here for the current version.</p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data: <a href="mailto:stephanwasalathanthrige@gmail.com">stephanwasalathanthrige@gmail.com</a>.
      </p>

      <p className="legal-disclaimer">
        This policy describes this project's actual data handling and isn't a substitute for
        legal advice. It hasn't been reviewed by a lawyer.
      </p>
    </section>
  )
}
