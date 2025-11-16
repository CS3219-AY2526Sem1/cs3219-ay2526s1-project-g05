import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Footer } from "@/components/Footer";
import "./App.css";

function App() {
  return (
    <div className="w-screen h-screen">
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
}

export default App;
