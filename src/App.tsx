import { HashRouter, Routes, Route } from 'react-router-dom';
import { LearningProvider } from '@/context/LearningContext';
import { HomeSection } from '@/sections/HomeSection';
import { FlashcardSection } from '@/sections/FlashcardSection';
import { TypingSection } from '@/sections/TypingSection';
import { DialogueSection } from '@/sections/DialogueSection';
import { ProgressSection } from '@/sections/ProgressSection';
import { CategoriesSection } from '@/sections/CategoriesSection';

function App() {
  return (
    <HashRouter>
      <LearningProvider>
        <Routes>
          <Route path="/" element={<HomeSection />} />
          <Route path="/learn/flashcard" element={<FlashcardSection />} />
          <Route path="/learn/typing" element={<TypingSection />} />
          <Route path="/learn/dialogue" element={<DialogueSection />} />
          <Route path="/progress" element={<ProgressSection />} />
          <Route path="/categories" element={<CategoriesSection />} />
        </Routes>
      </LearningProvider>
    </HashRouter>
  );
}

export default App;
