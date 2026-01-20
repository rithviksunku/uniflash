import { useNavigate } from 'react-router-dom';

const Help = () => {
  const navigate = useNavigate();

  return (
    <div className="help-page">
      <div className="help-header">
        <h1>🦄 Uniflash Help Center</h1>
        <p>Your magical study companion for healthcare students</p>
      </div>

      <div className="help-sections">
        <section className="help-section">
          <h2>🚀 Getting Started</h2>
          <div className="help-card">
            <h3>1. Upload Your Content</h3>
            <p>Click "Upload" and select your PowerPoint (.pptx) or PDF files. Our AI will extract the content and prepare it for flashcard creation.</p>
          </div>
          <div className="help-card">
            <h3>2. Create Flashcard Sets</h3>
            <p>Go to "My Sets" and create organized collections like "Anatomy Chapter 5" or "Pharmacology Exam 1". Customize with emojis and colors!</p>
          </div>
          <div className="help-card">
            <h3>3. Generate or Create Flashcards</h3>
            <p>Use AI to auto-generate flashcards from your slides, or create them manually. Assign each card to a set for better organization.</p>
          </div>
        </section>

        <section className="help-section">
          <h2>📚 Study Modes</h2>
          <div className="help-card">
            <h3>Review Mode (Spaced Repetition)</h3>
            <p><strong>Best for:</strong> Long-term memory retention</p>
            <ul>
              <li>Uses scientifically-proven spaced repetition algorithm</li>
              <li>Rate each card: Again, Hard, Good, or Easy</li>
              <li>Cards reappear at optimal intervals</li>
              <li>Filter by specific sets</li>
              <li>View source slides if confused</li>
            </ul>
          </div>
          <div className="help-card">
            <h3>Practice Mode</h3>
            <p><strong>Best for:</strong> Quick casual review</p>
            <ul>
              <li>No ratings or scheduling</li>
              <li>Tap anywhere to flip cards</li>
              <li>Navigate freely with prev/next</li>
              <li>Select specific sets to practice</li>
            </ul>
          </div>
        </section>

        <section className="help-section">
          <h2>🎯 Quizzes</h2>
          <div className="help-card">
            <h3>AI-Powered Quiz Generation</h3>
            <p>Generate multiple-choice quizzes from your flashcards or slides:</p>
            <ul>
              <li>Select flashcards from specific sets</li>
              <li>Choose slides from presentations</li>
              <li>AI creates realistic MCQ questions</li>
              <li>Track scores and review attempts</li>
            </ul>
          </div>
        </section>

        <section className="help-section">
          <h2>🤖 AI Features</h2>
          <div className="help-card">
            <h3>What Our AI Can Do</h3>
            <ul>
              <li><strong>Grammar Cleanup:</strong> Improve flashcard text while preserving medical terminology</li>
              <li><strong>Auto-Generate Flashcards:</strong> Create 2-3 quality flashcards per slide</li>
              <li><strong>Quiz Questions:</strong> Generate MCQ questions with realistic distractors</li>
              <li><strong>PDF Parsing:</strong> Extract and structure content from PDF lecture notes</li>
            </ul>
            <p className="help-note">💡 All AI features use GPT-3.5-turbo for accuracy and cost-efficiency</p>
          </div>
        </section>

        <section className="help-section">
          <h2>🔍 Search & Filter</h2>
          <div className="help-card">
            <h3>Finding Your Cards</h3>
            <ul>
              <li><strong>Search Bar:</strong> Type keywords to search front and back of cards</li>
              <li><strong>Filter by Set:</strong> View only cards from specific sets</li>
              <li><strong>Set Badges:</strong> Color-coded labels show which set each card belongs to</li>
            </ul>
          </div>
        </section>

        <section className="help-section">
          <h2>📊 Tracking Progress</h2>
          <div className="help-card">
            <h3>Your Stats</h3>
            <ul>
              <li>Daily study minutes</li>
              <li>Study streaks (consecutive days)</li>
              <li>Cards reviewed per session</li>
              <li>Active time tracking (excludes idle time)</li>
              <li>Set-specific progress</li>
            </ul>
          </div>
        </section>

        <section className="help-section">
          <h2>💡 Pro Tips</h2>
          <div className="help-card">
            <ul>
              <li>🎨 Use different colors for each subject to quickly identify sets</li>
              <li>📝 Keep flashcards focused on one concept per card</li>
              <li>🔄 Review daily for best results - even 10 minutes helps!</li>
              <li>🤖 Use AI Cleanup to improve poorly formatted cards</li>
              <li>📊 Check your study streaks to stay motivated</li>
              <li>🎯 Take quizzes before exams to test yourself</li>
            </ul>
          </div>
        </section>

        <section className="help-section">
          <h2>❓ Common Questions</h2>
          <div className="help-card">
            <h3>How does spaced repetition work?</h3>
            <p>Cards you find Easy appear less frequently, while Hard cards come back sooner. This optimizes your study time by focusing on what you need to practice most.</p>
          </div>
          <div className="help-card">
            <h3>Can I edit flashcards after creating them?</h3>
            <p>Yes! Go to "My Flashcards" and click the Edit button on any card.</p>
          </div>
          <div className="help-card">
            <h3>What file types are supported?</h3>
            <p>PowerPoint (.pptx) and PDF (.pdf) files. PDFs use AI to extract structured content.</p>
          </div>
          <div className="help-card">
            <h3>How is study time calculated?</h3>
            <p>We only count active time - the timer pauses when you view source slides or are idle.</p>
          </div>
        </section>

        <section className="help-section">
          <h2>🦄 Why "Uniflash"?</h2>
          <div className="help-card">
            <p>Because learning should be magical! We combine the power of AI with beautiful design to make studying healthcare content enjoyable and effective.</p>
            <p className="help-quote">"Study smarter, not harder - with a touch of unicorn magic ✨"</p>
          </div>
        </section>
      </div>

      <div className="help-footer">
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Help;
