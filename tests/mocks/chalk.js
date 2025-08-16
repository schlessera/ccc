// Mock implementation of chalk for Jest tests
const createColorFunction = (color) => {
  const colorFn = (text) => `${color.toUpperCase()}(${text})`;
  // Add chainable methods
  colorFn.bold = (text) => `${color.toUpperCase()}_BOLD(${text})`;
  colorFn.dim = (text) => `${color.toUpperCase()}_DIM(${text})`;
  return colorFn;
};

const chalk = {
  red: createColorFunction('red'),
  green: createColorFunction('green'),
  blue: createColorFunction('blue'),
  yellow: createColorFunction('yellow'),
  cyan: createColorFunction('cyan'),
  gray: createColorFunction('gray'),
  grey: createColorFunction('gray'),
  bold: (text) => `BOLD(${text})`,
  dim: (text) => `DIM(${text})`,
};

// Add chainable methods to existing colors
chalk.red.bold = (text) => `RED_BOLD(${text})`;
chalk.green.bold = (text) => `GREEN_BOLD(${text})`;
chalk.blue.bold = (text) => `BLUE_BOLD(${text})`;
chalk.cyan.bold = (text) => `CYAN_BOLD(${text})`;

// Create the main chalk function
const chalkFunction = (text) => text;

// Add all color methods to the function
Object.keys(chalk).forEach(key => {
  chalkFunction[key] = chalk[key];
});

// Handle property access for any unknown colors
const handler = {
  get(target, prop) {
    if (target[prop]) {
      return target[prop];
    }
    // Return a function that wraps text for unknown colors
    return createColorFunction(prop);
  }
};

const chalkProxy = new Proxy(chalkFunction, handler);

// Support both CommonJS and ES modules
module.exports = chalkProxy;
module.exports.default = chalkProxy;