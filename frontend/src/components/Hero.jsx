import { Button, buttonVariants } from "./ui/button";
import hero from "@/assets/hero.png";
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="container mx-auto px-4 md:px-8 lg:px-16 py-20 grid lg:grid-cols-2 place-items-center gap-10">
      <div className="text-center lg:text-start space-y-6">
        <main className="text-5xl md:text-6xl font-bold">
          <h1 className="inline">
            <span className="inline bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">
              Collaborative
            </span>{" "}
            tool
          </h1>{" "}
          for{" "}
          <h2 className="inline">
            <span className="inline bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
              technical interviews
            </span>
          </h2>
        </main>

        <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
          Team up with candidates and solve interview questions with PeerPrep today!
        </p>

        <div className="space-y-4 md:space-y-0 md:space-x-4">
          <Link to="/login">
            <Button variant="default" className="dark:bg-white dark:text-black w-full md:w-1/3">
              Get Started
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero cards sections */}
      <div className="z-10">
        <img src={hero} alt="hero"></img>
      </div>

      {/* Shadow effect */}
      <div className="shadow"></div>
    </section>
  );
};
