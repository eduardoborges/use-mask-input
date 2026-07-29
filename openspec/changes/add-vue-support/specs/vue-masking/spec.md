## ADDED Requirements

### Requirement: Mask directive applies a mask on mount

The package SHALL provide a Vue directive `vMaskInput` (usable as `v-mask-input`) that applies the given mask to the bound element when the element is mounted.

#### Scenario: Alias mask on a native input

- **WHEN** an `<input>` is rendered with `v-mask-input="'cpf'"` and the user types `12345678901`
- **THEN** the element displays `123.456.789-01`

#### Scenario: Raw mask pattern

- **WHEN** an `<input>` is rendered with `v-mask-input="'(99) 99999-9999'"` and the user types `11987654321`
- **THEN** the element displays `(11) 98765-4321`

#### Scenario: Mask with options

- **WHEN** an `<input>` is rendered with `v-mask-input="{ mask: 'currency', options: { prefix: 'R$ ' } }"`
- **THEN** the applied mask uses the `currency` alias with `prefix` overridden to `R$ `

#### Scenario: Array of mask patterns

- **WHEN** an `<input>` is rendered with `v-mask-input="['999-999', '999-999-999']"`
- **THEN** Inputmask receives both patterns and matches input against them

#### Scenario: Null mask is inert

- **WHEN** an `<input>` is rendered with `v-mask-input="null"`
- **THEN** no mask is applied and the element accepts input unchanged

### Requirement: User options override alias defaults

When a mask alias is combined with user options, the user's options SHALL take precedence over the alias's defaults, matching the existing `getMaskOptions` contract.

#### Scenario: Overriding an alias default

- **WHEN** `v-mask-input="{ mask: 'brl-currency', options: { prefix: 'US$ ' } }"` is applied
- **THEN** the resolved Inputmask configuration retains the alias's `radixPoint` and `groupSeparator` but uses `US$ ` as the prefix

### Requirement: Mask re-applies only when the mask binding changes

The directive's update hook SHALL re-apply the mask when the bound mask or options change, and SHALL NOT re-apply when the binding is unchanged, so that unrelated re-renders do not reset the input's buffer or caret position.

#### Scenario: Mask value changes

- **WHEN** the bound mask changes from `'cpf'` to `'cnpj'` on an already-mounted element
- **THEN** the new mask is applied and subsequent typing formats using the CNPJ pattern

#### Scenario: Unrelated re-render

- **WHEN** the component re-renders with the bound mask unchanged while the user has a caret mid-value
- **THEN** the mask is not re-applied and the element's value and caret position are preserved

### Requirement: Mask is torn down on unmount

The directive SHALL remove the Inputmask instance from the element when the element unmounts, so that no listeners or instance state outlive the element.

#### Scenario: Element unmounts

- **WHEN** an element bound with `v-mask-input` is unmounted
- **THEN** the element's `inputmask` instance is removed

### Requirement: Mask composable returns a ref callback and unmasked value accessor

The package SHALL provide a `useMaskInput(mask, options?)` composable that returns a ref callback to bind via `:ref`, together with an `unmaskedValue()` accessor returning the element's current unmasked value.

#### Scenario: Binding to a native input

- **WHEN** `const { maskRef } = useMaskInput('cpf')` is bound as `<input :ref="maskRef">` and the user types `12345678901`
- **THEN** the element displays `123.456.789-01`

#### Scenario: Reading the unmasked value

- **WHEN** the masked element displays `123.456.789-01`
- **THEN** `unmaskedValue()` returns `12345678901`

#### Scenario: Unmasked value before mount

- **WHEN** `unmaskedValue()` is called before the ref has been attached to any element
- **THEN** it returns an empty string rather than throwing

#### Scenario: Ref detaches on unmount

- **WHEN** the bound element unmounts and the ref callback is invoked with `null`
- **THEN** the composable clears its internal element reference without throwing

### Requirement: Element resolution through wrappers and Vue component instances

Mask application SHALL resolve the underlying `<input>` or `<textarea>` element when the target is a wrapper element or a Vue component rather than a native input, so that components from third-party libraries can be masked.

#### Scenario: Directive on a wrapper component

- **WHEN** `v-mask-input` is placed on a component whose root element is a `<div>` containing an `<input>`
- **THEN** the mask is applied to the inner `<input>`

#### Scenario: Ref on a component with a single root element

- **WHEN** the mask ref callback receives a Vue component public instance whose `$el` is a wrapper `<div>` containing an `<input>`
- **THEN** the mask is applied to the inner `<input>`

#### Scenario: Ref on a component with a fragment root

- **WHEN** the mask ref callback receives a component instance whose `$el` is a non-element node
- **THEN** resolution returns without applying a mask and without throwing

#### Scenario: Component exposing the element directly

- **WHEN** the ref callback receives a component instance whose `$el` is itself the `<input>` element
- **THEN** the mask is applied to that element directly

#### Scenario: Textarea target

- **WHEN** the resolved wrapper contains a `<textarea>` rather than an `<input>`
- **THEN** the mask is applied to the `<textarea>`

#### Scenario: No maskable element found

- **WHEN** the ref callback receives a component instance containing no `<input>` or `<textarea>`
- **THEN** no mask is applied and no error is thrown

### Requirement: Shared mask semantics across surfaces

The directive and the composable SHALL route mask application through a single internal implementation, so that a given mask and options produce identical Inputmask configuration regardless of which surface is used.

#### Scenario: Identical configuration across surfaces

- **WHEN** the same mask and options are applied via the directive and via the composable
- **THEN** both produce the same resolved Inputmask configuration and the same displayed value for the same typed input

### Requirement: maxlength stripping applies to Vue surfaces

Applying a mask that renders literals or placeholder characters SHALL remove a conflicting native `maxlength` attribute from the target element, matching the existing behaviour of the React entry.

#### Scenario: Literal-bearing mask with maxlength

- **WHEN** an `<input maxlength="11">` is masked with `'cpf'`
- **THEN** the `maxlength` attribute is removed and the user can type the full masked value

#### Scenario: Open-ended mask keeps maxlength

- **WHEN** an `<input maxlength="5">` is masked with the `'numeric'` alias
- **THEN** the `maxlength` attribute is retained
