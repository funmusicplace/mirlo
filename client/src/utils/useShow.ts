import React from "react";

function useShow() {
  const [show, setShow] = React.useState("");

  React.useEffect(() => {
    let lastScrollY = window.scrollY;

    const updateShow = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? "down" : "up";
      if (
        direction !== show &&
        (scrollY - lastScrollY > 10 || scrollY - lastScrollY < -10)
      ) {
        setShow(direction);
      }
      lastScrollY = scrollY > 0 ? scrollY : 0;
    };
    window.addEventListener("scroll", updateShow); // add event listener
    return () => {
      window.removeEventListener("scroll", updateShow); // clean up
    };
  }, [show]);

  return show;
}

export default useShow;
