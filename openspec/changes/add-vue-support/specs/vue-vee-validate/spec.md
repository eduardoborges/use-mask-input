## ADDED Requirements

These requirements describe the behaviour a vee-validate 4 consumer SHALL be able to rely on. Whether each is satisfied by the directive alone plus documentation, or by a dedicated helper, is determined by the spike in `design.md` decision 9 — the observable behaviour is the same either way.

### Requirement: Masked input synchronises with vee-validate field state

A masked input bound to a vee-validate field SHALL propagate the user's input into that field's state as the user types.

#### Scenario: Typing updates the field value

- **WHEN** an `<input>` bound to `useField('cpf')` and masked with `v-mask-input="'cpf'"` receives the typed characters `12345678901`
- **THEN** the field's `value` reflects the input rather than remaining at its initial value

#### Scenario: Field is marked dirty

- **WHEN** the user types into a masked field that was previously untouched
- **THEN** vee-validate reports the field as dirty

### Requirement: Validation runs against masked field input

Validation rules attached to a masked field SHALL execute on the field's change and blur events, and their resulting error message SHALL be exposed through vee-validate's normal `errorMessage` surface.

#### Scenario: Invalid value produces an error message

- **WHEN** a masked field with a validation rule requiring a complete CPF contains an incomplete value and validation is triggered
- **THEN** `errorMessage` is populated

#### Scenario: Valid value clears the error message

- **WHEN** the same field is then completed with a valid value and validation re-runs
- **THEN** `errorMessage` is empty

#### Scenario: Blur triggers validation

- **WHEN** the user blurs a masked field bound to vee-validate
- **THEN** validation runs, and Inputmask's own blur handling does not suppress the event

### Requirement: Unmasked value is available for validation and submission

A consumer SHALL be able to have the unmasked value — not the masked display string — reach vee-validate's field state, so that validation schemas and submit handlers receive the raw value.

#### Scenario: Submit receives the unmasked value

- **WHEN** a form with a CPF field displaying `123.456.789-01` is submitted through vee-validate's `handleSubmit`
- **THEN** the submitted values contain `12345678901` for that field

#### Scenario: Validation schema receives the unmasked value

- **WHEN** a validation schema asserting an 11-character CPF runs against the field
- **THEN** it receives `12345678901` and the assertion passes

#### Scenario: Masked display is preserved

- **WHEN** the unmasked value is stored in field state
- **THEN** the input continues to display the masked string `123.456.789-01`

### Requirement: Programmatic field updates re-render the mask

Setting a masked field's value programmatically through vee-validate SHALL update the input's masked display without corrupting Inputmask's internal buffer.

#### Scenario: setValue renders the masked display

- **WHEN** `setValue('12345678901')` is called on a masked CPF field
- **THEN** the input displays `123.456.789-01`

#### Scenario: resetForm restores the initial masked display

- **WHEN** `resetForm()` is called on a form whose CPF field had an initial value of `12345678901`
- **THEN** the input displays `123.456.789-01`

#### Scenario: Editing after a programmatic set behaves correctly

- **WHEN** a value is set programmatically, then the user selects all, deletes, and types a new value
- **THEN** the first deletion registers a change and the newly typed value is masked correctly

### Requirement: vee-validate remains an optional dependency

The vee-validate integration SHALL be importable without vee-validate installed being a requirement for other Vue consumers, and its absence SHALL NOT break the directive, composable, or component.

#### Scenario: Vue consumer without vee-validate

- **WHEN** a Vue project that does not install vee-validate imports the directive, composable, and component from `use-mask-input/vue`
- **THEN** all three work and no vee-validate module resolution is attempted
