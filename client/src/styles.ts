const styles = `html {
  --mi-black: rgba(25,25,25,1);
  --mi-white: #ffffff;
  --mi-pink: #BE3455;

  --mi-normal-background-color: #f5f0f0;
  --mi-lighten-background-color: rgba(255, 255, 255, 0.2);
  --mi-lighten-x-background-color: rgba(255, 255, 255, 0.5);
  --mi-darken-background-color: rgba(50, 0, 0, .03);
  --mi-darken-x-background-color: rgba(50, 0, 0, .2);

  --mi-normal-foreground-color: var(--mi-black);
  --mi-light-foreground-color: #888;
  --mi-lighter-foreground-color: #bbb;

  --mi-primary-color: var(--mi-black);
  --mi-secondary-color: pink;

  --mi-info-background-color: #5C899C;
  --mi-success-background-color: #4cdb5f;

  --mi-warning-color: #f04e37;
  --mi-warning-background-color: var(--mi-warning-color);
  --mi-darken-warning-background-color: #df250b;

  --mi-border-radius: 2px;
  --mi-border-radius-focus: 8px;

  --mi-icon-button-background-color: var(--mi-darken-x-background-color);

  --mi-font-family-stack: 'Arial', -apple-system, BlinkMacSystemFont,
    'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans',
    'Droid Sans', 'Helvetica Neue', sans-serif;

  --mi-font-size-normal: 1rem;
  --mi-font-size-small: .875rem;
  --mi-font-size-xsmall: .75rem;

  --mi-side-paddings-normal: 0rem 2rem;
  --mi-side-paddings-small: 0rem 1rem;
  --mi-side-paddings-xsmall: 0rem .7rem;

}



@media (prefers-color-scheme: dark) {
  html {
    --mi-normal-background-color: var(--mi-black);
    --mi-normal-foreground-color: var(--mi-white);
    --mi-darken-background-color: rgba(0, 0, 0, 0.03);
    --mi-lighten-background-color: rgba(255, 255, 255, 0.2);

    --mi-lighter-foreground-color: #888;
    --mi-light-foreground-color: #bbb;

    --mi-primary-color: var(--mi-white);
    --mi-secondary-color: var(--mi-pink);
  }
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  min-height: 100%;
}

body {
  background-color: var(--mi-normal-background-color);
  color: var(--mi-normal-foreground-color);
  font-family: var(--mi-font-family-stack);
  font-smoothing: antialiased;
}

body,
#root {
  min-height: 100%;
}

h1 {
  font-size: 2.5rem;
  line-height: 2em;
  font-weight: normal;

  a {
    text-decoration: none;
  }
}

h2 {
  font-size: 1.5rem;
  line-height: 1.5;
  font-weight: normal;
  margin-bottom: .7rem;
}

h3 {
  font-size: 1.7rem;
  padding-bottom: 1rem;
}

h4 {
  font-size: 1.4rem;
  padding-bottom: .75rem;
}

h5 {
  font-size: 1.2rem;
  padding-bottom: .75rem;
}

h6 {
  font-size: 1.1rem;
  padding-bottom: .75rem;
}

@media (max-width: 800px) {
  h1 {
    font-size: 2rem;
  }

  h2 {
    font-size: 1.3rem;
    margin-bottom: .5rem;
  }
  h3 {
    font-size: 1.2rem;
    padding-bottom: 1rem;
  }
  h4 {
    font-size: 1.3rem;
    padding-bottom: .75rem;
  }
}
@media (max-width: 430px) {
  html {
    font-size: 16px;
  }
  h5 {
    font-size: 1rem;
    margin-bottom: 0rem;
  }
}

a {
  transition: .25s color, .25s background-color;
  color: var(--normal-foreground-color);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
  a {
    text-decoration: none;
  }
}

button {
  font-family: var(--mi-font-family-stack);
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-3rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(3rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spinning {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
`;

export default styles;
