import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer
      id="footer"
      className="border-t dark:border-t-slate-700 bg-background dark:bg-background"
    >
      <section className="w-full flex flex-col items-center justify-center py-10 gap-4 text-center">
        <a
          rel="noreferrer noopener"
          href="/"
          className="font-bold text-xl flex items-center justify-center"
        >
          <img src={logo} alt="PeerPrep logo" height="40" width="150" />
        </a>

        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PeerPrep. All rights reserved.
        </p>
      </section>
    </footer>
  );
};
