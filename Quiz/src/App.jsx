import React, { useEffect, useState } from "react";
import './App.css';

const QuizApp = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetch("https://the-trivia-api.com/v2/questions")
      .then((res) => res.json())
      .then((data) => {
        // Shuffle answers
        const formatted = data.map((q) => {
          const options = [...q.incorrectAnswers, q.correctAnswer];
          return {
            question: q.question.text,
            correctAnswer: q.correctAnswer,
            options: shuffleArray(options),
          };
        });
        setQuestions(formatted);
      })
      .catch((err) => console.error("Failed to fetch questions:", err));
  }, []);

  const shuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);

  const handleAnswer = (selected) => {
    const correct = questions[currentQIndex].correctAnswer;
    if (selected === correct) {
      setScore(score + 1);
    }
    setUserAnswers([...userAnswers, selected]);
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQIndex(0);
    setUserAnswers([]);
    setShowResult(false);
    setScore(0);
    setQuestions([]);
    // Refetch questions
    fetch("https://the-trivia-api.com/v2/questions")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((q) => {
          const options = [...q.incorrectAnswers, q.correctAnswer];
          return {
            question: q.question.text,
            correctAnswer: q.correctAnswer,
            options: shuffleArray(options),
          };
        });
        setQuestions(formatted);
      })
      .catch((err) => console.error("Failed to fetch questions:", err));
  };

  if (questions.length === 0) {
    return (
      <div className="quiz-container">
        <div className="loading">Loading questions...</div>
      </div>
    );
  }

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="quiz-container">
        <div className="results-container">
          <div className="results-header">
            <h2>🎉 Quiz Complete!</h2>
            <div className="score-display">
              Your Score: {score} / {questions.length} ({percentage}%)
            </div>
            <button 
              className="option-button" 
              onClick={restartQuiz}
              style={{marginBottom: '20px'}}
            >
              🔄 Take Quiz Again
            </button>
          </div>
          <ul className="results-list">
            {questions.map((q, idx) => {
              const isCorrect = userAnswers[idx] === q.correctAnswer;
              return (
                <li 
                  key={idx} 
                  className={`result-item ${isCorrect ? 'correct' : 'incorrect'}`}
                >
                  <div className="result-question">{q.question}</div>
                  <div className={`result-answer user-answer ${!isCorrect ? 'incorrect' : ''}`}>
                    Your Answer: {userAnswers[idx]}
                  </div>
                  {!isCorrect && (
                    <div className="result-answer correct-answer">
                      Correct Answer: {q.correctAnswer}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQIndex];
  const progress = ((currentQIndex + 1) / questions.length) * 100;

  return (
    <div className="quiz-container">
      <div className="question-header">
        <h2>Question {currentQIndex + 1} of {questions.length}</h2>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      <div className="question-text">
        {currentQuestion.question}
      </div>
      
      <div className="options-container">
        {currentQuestion.options.map((option, i) => (
          <button
            key={i}
            className="option-button"
            onClick={() => handleAnswer(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuizApp;
