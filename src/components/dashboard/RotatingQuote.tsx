'use client'

import { useEffect, useState } from 'react'

// Collection of research-related quotes displayed on the dashboard
const quotes = [
"Research is what I'm doing when I don't know what I'm doing. — Wernher von Braun",
"The important thing is to never stop questioning. — Albert Einstein",
"Somewhere, something incredible is waiting to be known. — Carl Sagan",
"Research is formalized curiosity. — Zora Neale Hurston",
"If we knew what it was we were doing, it would not be called research. — Albert Einstein",
"Research means that you don't know, but are willing to find out. — Charles Kettering",
"Research is creating new knowledge. — Neil Armstrong",
"Discovery consists of seeing what everybody has seen and thinking what nobody has thought. — Albert Szent-Györgyi",
"Without data, you're just another person with an opinion. — W. Edwards Deming",
"The purpose of research is to inform action. — Kurt Lewin",
"Curiosity is the engine of achievement. — Ken Robinson",
"Knowledge begins with curiosity.",
"Every great advance in science has issued from a new audacity of imagination. — John Dewey",
"The joy of discovery is the liveliest the mind can feel. — Claude Bernard",
"Research is the process of going up alleys to see if they are blind. — Marston Bates",
"Science is organized knowledge. — Herbert Spencer",
"Research is the art of asking better questions.",
"Innovation begins with curiosity.",
"Learning never exhausts the mind. — Leonardo da Vinci",
"The best way to predict the future is to create it. — Peter Drucker",

"Curiosity drives the progress of science.",
"Small questions often lead to great discoveries.",
"Every answer begins with a question.",
"Great discoveries start with simple curiosity.",
"Knowledge grows when curiosity leads the way.",
"Research transforms questions into knowledge.",
"Scientific discovery begins with observation.",
"The future belongs to the curious.",
"Persistence is the backbone of research.",
"New knowledge changes the world.",

"Every experiment teaches something new.",
"Understanding begins with investigation.",
"Curiosity fuels discovery.",
"The unknown invites exploration.",
"Research reveals hidden truths.",
"The pursuit of knowledge never ends.",
"Discovery is the reward of curiosity.",
"Learning opens doors to innovation.",
"The mind grows through exploration.",
"Research illuminates the unknown.",

"Questions are the seeds of discovery.",
"The path to knowledge begins with inquiry.",
"Exploration turns curiosity into insight.",
"Discovery rewards persistence.",
"The spirit of inquiry drives progress.",
"Knowledge expands through investigation.",
"Curiosity shapes the future.",
"Research transforms uncertainty into understanding.",
"The search for truth begins with a question.",
"Discovery is curiosity in action.",

"Every breakthrough starts with curiosity.",
"Scientific inquiry fuels progress.",
"Learning thrives on curiosity.",
"The quest for knowledge is endless.",
"Discovery expands human understanding.",
"Curiosity leads to innovation.",
"Investigation reveals the unknown.",
"The mind grows through discovery.",
"Research strengthens knowledge.",
"Exploration reveals hidden possibilities.",

"Insight grows from persistent inquiry.",
"Curiosity lights the path of discovery.",
"Learning is the gateway to progress.",
"Knowledge thrives through research.",
"Discovery shapes the future.",
"Exploration fuels innovation.",
"The pursuit of knowledge drives humanity forward.",
"Curiosity builds understanding.",
"Research advances civilization.",
"The joy of discovery inspires innovation.",

"Progress begins with curiosity.",
"Investigation reveals deeper understanding.",
"The search for truth inspires research.",
"Learning transforms curiosity into knowledge.",
"Discovery pushes the boundaries of knowledge.",
"Curiosity sparks scientific breakthroughs.",
"Knowledge expands through discovery.",
"The unknown invites exploration.",
"Research connects questions to answers.",
"Discovery transforms imagination into reality.",

"Curiosity inspires new perspectives.",
"The mind thrives on discovery.",
"Knowledge emerges through inquiry.",
"Investigation leads to innovation.",
"Discovery drives scientific advancement.",
"Curiosity challenges assumptions.",
"Research reveals new possibilities.",
"The pursuit of knowledge inspires progress.",
"Discovery begins with curiosity.",
"Learning unlocks understanding.",

"Questions lead to discovery.",
"Curiosity drives knowledge forward.",
"Research reveals the unseen.",
"The journey of discovery never ends.",
"Knowledge grows through exploration.",
"Curiosity shapes innovation.",
"Discovery transforms ideas into reality.",
"The search for knowledge is endless.",
"Curiosity is the beginning of wisdom.",
"Research builds the future."
]

// Component that displays a random research quote on the dashboard
export default function RotatingQuote() {

  // Store the currently displayed quote
  const [quote, setQuote] = useState(quotes[0])

  // Select a random quote when the component loads
  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
    setQuote(randomQuote)
  }, [])

  // Render the quote text
  return (
    <p className="text-gray-500 italic">
      "{quote}"
    </p>
  )
}