import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer id="footer">
      <hr className="w-11/12 mx-auto" />

      <section className="container px-4 md:px-8 xl:px-16 py-20 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-12 gap-y-8">
        <div className="col-span-full xl:col-span-2">
          <a rel="noreferrer noopener" href="/" className="font-bold text-xl flex">
            <img src={logo} alt="logo" height="100" width="191"></img>
          </a>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">Follow Us</h3>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Github</a>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Twitter</a>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Dribbble</a>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">Platforms</h3>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Web</a>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Mobile</a>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Desktop</a>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">About</h3>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Explore</a>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Problems</a>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Discuss</a>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">Community</h3>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Youtube</a>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Discord</a>
          <a rel="noreferrer noopener" href="#" className="opacity-60 hover:opacity-100">Twitch</a>
        </div>
      </section>

      <section className="container pb-14 text-center">
        <h3>
          &copy; 2025 PeerPrep
        </h3>
      </section>
    </footer>
  );
};
