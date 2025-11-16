import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

function MainLayout({ children }) {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col">
      <Navbar />
      <div className="flex-1 overflow-y-auto pb-1">{children}</div>
    </div>
  );
}

export default MainLayout;
