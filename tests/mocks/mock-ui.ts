/**
 * Mock implementations for UI prompts used in testing
 */

export interface MockPromptResponse {
  type: 'text' | 'select' | 'confirm' | 'multiselect';
  response: any;
}

export class MockUI {
  private responses: MockPromptResponse[] = [];
  private currentIndex = 0;
  private outputs: string[] = [];

  /**
   * Queue a response for the next prompt
   */
  queueResponse(type: MockPromptResponse['type'], response: any): this {
    this.responses.push({ type, response });
    return this;
  }

  /**
   * Queue text input response
   */
  queueText(text: string): this {
    return this.queueResponse('text', text);
  }

  /**
   * Queue select option response
   */
  queueSelect(value: string): this {
    return this.queueResponse('select', value);
  }

  /**
   * Queue confirmation response
   */
  queueConfirm(confirm: boolean): this {
    return this.queueResponse('confirm', confirm);
  }

  /**
   * Queue multi-select response
   */
  queueMultiSelect(values: string[]): this {
    return this.queueResponse('multiselect', values);
  }

  /**
   * Queue cancellation response
   */
  queueCancel(): this {
    return this.queueResponse('select', Symbol('CANCEL'));
  }

  /**
   * Get the next queued response
   */
  private getNextResponse(expectedType: string): any {
    if (this.currentIndex >= this.responses.length) {
      throw new Error(`No more responses queued for ${expectedType} prompt`);
    }

    const response = this.responses[this.currentIndex++];
    
    if (response.type !== expectedType) {
      throw new Error(`Expected ${expectedType} response but got ${response.type}`);
    }

    return response.response;
  }

  /**
   * Mock intro message
   */
  intro(message: string): void {
    this.outputs.push(`INTRO: ${message}`);
  }

  /**
   * Mock outro message
   */
  outro(message: string): void {
    this.outputs.push(`OUTRO: ${message}`);
  }

  /**
   * Mock note message
   */
  note(message: string, title?: string): void {
    const prefix = title ? `NOTE (${title}): ` : 'NOTE: ';
    this.outputs.push(`${prefix}${message}`);
  }

  /**
   * Mock cancel message
   */
  cancel(message: string): void {
    this.outputs.push(`CANCEL: ${message}`);
  }

  /**
   * Mock text prompt
   */
  async text(options: {
    message: string;
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string) => string | undefined;
  }): Promise<string> {
    this.outputs.push(`TEXT PROMPT: ${options.message}`);
    
    const response = this.getNextResponse('text');
    
    // Validate the response if validator is provided
    if (options.validate) {
      const validationResult = options.validate(response);
      if (validationResult) {
        throw new Error(`Validation failed: ${validationResult}`);
      }
    }
    
    return response;
  }

  /**
   * Mock select prompt
   */
  async select(options: {
    message: string;
    options: Array<{ value: string; label: string; hint?: string }>;
    initialValue?: string;
  }): Promise<string> {
    this.outputs.push(`SELECT PROMPT: ${options.message}`);
    
    const response = this.getNextResponse('select');
    
    // Handle cancellation
    if (typeof response === 'symbol') {
      return response as any;
    }
    
    // Validate that the response is one of the available options
    const validValues = options.options.map(opt => opt.value);
    if (!validValues.includes(response)) {
      throw new Error(`Invalid selection: ${response}. Valid options: ${validValues.join(', ')}`);
    }
    
    return response;
  }

  /**
   * Mock confirm prompt
   */
  async confirm(options: {
    message: string;
    initialValue?: boolean;
  }): Promise<boolean> {
    this.outputs.push(`CONFIRM PROMPT: ${options.message}`);
    return this.getNextResponse('confirm');
  }

  /**
   * Mock multi-select prompt
   */
  async multiselect(options: {
    message: string;
    options: Array<{ value: string; label: string; hint?: string }>;
    initialValues?: string[];
  }): Promise<string[]> {
    this.outputs.push(`MULTISELECT PROMPT: ${options.message}`);
    
    const response = this.getNextResponse('multiselect');
    
    // Validate that all responses are valid options
    const validValues = options.options.map(opt => opt.value);
    const invalidValues = response.filter((val: string) => !validValues.includes(val));
    
    if (invalidValues.length > 0) {
      throw new Error(`Invalid selections: ${invalidValues.join(', ')}`);
    }
    
    return response;
  }

  /**
   * Mock spinner
   */
  spinner() {
    return {
      start: (message: string) => {
        this.outputs.push(`SPINNER START: ${message}`);
      },
      stop: (message?: string) => {
        this.outputs.push(`SPINNER STOP: ${message || 'Done'}`);
      }
    };
  }

  /**
   * Check if a response is cancelled
   */
  isCancel(response: any): boolean {
    return typeof response === 'symbol' && response.toString() === 'Symbol(CANCEL)';
  }

  /**
   * Get all captured outputs
   */
  getOutputs(): string[] {
    return [...this.outputs];
  }

  /**
   * Clear all outputs and responses
   */
  reset(): void {
    this.outputs = [];
    this.responses = [];
    this.currentIndex = 0;
  }

  /**
   * Check if all queued responses were consumed
   */
  hasUnconsumedResponses(): boolean {
    return this.currentIndex < this.responses.length;
  }

  /**
   * Get the number of unused responses
   */
  getUnconsumedResponsesCount(): number {
    return this.responses.length - this.currentIndex;
  }
}

/**
 * Global mock UI instance for tests
 */
export const mockUI = new MockUI();

/**
 * Jest mock functions that can be used to replace @clack/prompts
 */
export const clackMocks = {
  intro: jest.fn((message: string) => mockUI.intro(message)),
  outro: jest.fn((message: string) => mockUI.outro(message)),
  note: jest.fn((message: string, title?: string) => mockUI.note(message, title)),
  cancel: jest.fn((message: string) => mockUI.cancel(message)),
  text: jest.fn((options: any) => mockUI.text(options)),
  select: jest.fn((options: any) => mockUI.select(options)),
  confirm: jest.fn((options: any) => mockUI.confirm(options)),
  multiselect: jest.fn((options: any) => mockUI.multiselect(options)),
  spinner: jest.fn(() => mockUI.spinner()),
  isCancel: jest.fn((response: any) => mockUI.isCancel(response))
};