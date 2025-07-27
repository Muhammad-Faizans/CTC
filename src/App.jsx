import React, { useEffect, useState } from "react";

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

  if (questions.length === 0) {
    return <div>Loading questions...</div>;
  }

  if (showResult) {
    return (
      <div>
        <h2>Quiz Complete!</h2>
        <p>
          Your Score: {score} / {questions.length}
        </p>
        <ul>
          {questions.map((q, idx) => (
            <li key={idx}>
              <strong>{q.question}</strong>
              <br />
              Your Answer: {userAnswers[idx]}
              <br />
              Correct Answer: {q.correctAnswer}
              <hr />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const currentQuestion = questions[currentQIndex];

  return (
    <div>
      <h2>Question {currentQIndex + 1} of {questions.length}</h2>
      <p>{currentQuestion.question}</p>
      <div>
        {currentQuestion.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(option)}
            style={{ display: "block", margin: "8px 0" }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuizApp;
