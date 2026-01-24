import {
  describe, expect, it, vi,
} from 'vitest';

import { findInputElement, isHTMLElement, resolveInputRef } from './elementResolver';

import type { Input } from '..';

describe('elementResolver', () => {
  describe('isHTMLElement', () => {
    it('returns true for valid HTMLElement', () => {
      const element = document.createElement('div');
      expect(isHTMLElement(element)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isHTMLElement(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isHTMLElement(undefined)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isHTMLElement('string')).toBe(false);
    });

    it('returns false for number', () => {
      expect(isHTMLElement(123)).toBe(false);
    });

    it('returns false for object without nodeType', () => {
      expect(isHTMLElement({})).toBe(false);
    });

    it('returns false for object without querySelector', () => {
      expect(isHTMLElement({ nodeType: 1 })).toBe(false);
    });

    it('returns false for object with non-function querySelector', () => {
      expect(isHTMLElement({ nodeType: 1, querySelector: 'not a function' })).toBe(false);
    });
  });

  describe('findInputElement', () => {
    it('returns null for null', () => {
      expect(findInputElement(null)).toBe(null);
    });

    it('returns null for undefined', () => {
      expect(findInputElement(undefined)).toBe(null);
    });

    it('returns input element directly if it is an INPUT', () => {
      const input = document.createElement('input');
      expect(findInputElement(input)).toBe(input);
    });

    it('returns textarea element directly if it is a TEXTAREA', () => {
      const textarea = document.createElement('textarea');
      expect(findInputElement(textarea)).toBe(textarea);
    });

    it('finds input inside wrapper element', () => {
      const wrapper = document.createElement('div');
      const input = document.createElement('input');
      wrapper.appendChild(input);
      expect(findInputElement(wrapper)).toBe(input);
    });

    it('finds textarea inside wrapper element', () => {
      const wrapper = document.createElement('div');
      const textarea = document.createElement('textarea');
      wrapper.appendChild(textarea);
      expect(findInputElement(wrapper)).toBe(textarea);
    });

    it('returns null if no input found inside wrapper', () => {
      const wrapper = document.createElement('div');
      const span = document.createElement('span');
      wrapper.appendChild(span);
      expect(findInputElement(wrapper)).toBe(null);
    });

    it('returns null for invalid element', () => {
      expect(findInputElement('not an element')).toBe(null);
    });

    it('handles querySelector error gracefully', () => {
      const element = {
        nodeType: 1,
        nodeName: 'DIV',
        querySelector: vi.fn(() => {
          throw new Error('querySelector error');
        }),
      };
      expect(findInputElement(element)).toBe(null);
    });

    it('handles element without querySelector method', () => {
      const element = {
        nodeType: 1,
        nodeName: 'DIV',
      };
      expect(findInputElement(element)).toBe(null);
    });

    it('handles element with non-function querySelector', () => {
      const element = {
        nodeType: 1,
        nodeName: 'DIV',
        querySelector: 'not a function',
      };
      expect(findInputElement(element)).toBe(null);
    });

    it('handles element where querySelector is not in element', () => {
      const element = {
        nodeType: 1,
        nodeName: 'DIV',
      };
      // element doesn't have querySelector property
      expect(findInputElement(element)).toBe(null);
    });

    it('handles querySelector returning null', () => {
      const element = {
        nodeType: 1,
        nodeName: 'DIV',
        querySelector: vi.fn(() => null),
      };
      expect(findInputElement(element)).toBe(null);
    });

    it('handles querySelector returning non-HTMLElement', () => {
      const element = {
        nodeType: 1,
        nodeName: 'DIV',
        querySelector: vi.fn(() => 'not an element'),
      };
      expect(findInputElement(element)).toBe(null);
    });
  });

  describe('resolveInputRef', () => {
    it('returns null for null', () => {
      expect(resolveInputRef(null)).toBe(null);
    });

    it('returns element for direct HTMLElement', () => {
      const input = document.createElement('input');
      expect(resolveInputRef(input)).toBe(input);
    });

    it('returns element from ref object with current', () => {
      const input = document.createElement('input');
      const ref = { current: input };
      expect(resolveInputRef(ref as unknown as Input)).toBe(input);
    });

    it('returns null for ref object with null current', () => {
      const ref = { current: null } as unknown as Input;
      expect(resolveInputRef(ref)).toBe(null);
    });

    it('returns null for ref object with invalid current', () => {
      const ref = { current: 'not an element' } as unknown as Input;
      expect(resolveInputRef(ref)).toBe(null);
    });

    it('returns null for invalid input type', () => {
      expect(resolveInputRef('not an element' as unknown as Input)).toBe(null);
    });
  });
});
