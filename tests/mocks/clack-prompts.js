// Mock implementation of @clack/prompts for Jest tests
module.exports = {
  intro: jest.fn(),
  outro: jest.fn(), 
  note: jest.fn(),
  cancel: jest.fn(),
  log: {
    message: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    message: jest.fn(),
  })),
  text: jest.fn(),
  password: jest.fn(),
  confirm: jest.fn(),
  select: jest.fn(),
  multiselect: jest.fn(),
  groupMultiselect: jest.fn(),
  isCancel: jest.fn(() => false),
  
  // Symbol for cancellation
  CANCEL_SYMBOL: Symbol('clack:cancel'),
};