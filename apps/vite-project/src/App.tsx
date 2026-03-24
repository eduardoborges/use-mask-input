/**
 * useMaskInput API Test Suite
 * 
 * This demo application showcases all available mask aliases in the use-mask-input library.
 * It demonstrates integration with Ant Design Form components and real-time form state tracking.
 * 
 * @see https://github.com/eduardoborges/use-mask-input
 */

import { Button, Divider, Form, Input, Space, Typography } from 'antd'
import { useMaskInputAntd } from 'use-mask-input/antd'
import './App.css'

function App() {
  const [form] = Form.useForm()

  // Brazilian document masks
  const cpfMask = useMaskInputAntd({ mask: 'cpf' })
  const cnpjMask = useMaskInputAntd({ mask: 'cnpj' })

  // Brazilian banking masks
  const bankAccountMask = useMaskInputAntd({ mask: 'br-bank-account' })
  const bankAgencyMask = useMaskInputAntd({ mask: 'br-bank-agency' })

  // Currency masks
  const currencyMask = useMaskInputAntd({ mask: 'currency' })
  const brlCurrencyMask = useMaskInputAntd({ mask: 'brl-currency' })

  // Date and time
  const datetimeMask = useMaskInputAntd({ mask: 'datetime' })

  // Email and URL
  const emailMask = useMaskInputAntd({ mask: 'email' })
  const urlMask = useMaskInputAntd({ mask: 'url' })

  // Numeric masks
  const numericMask = useMaskInputAntd({ mask: 'numeric' })
  const decimalMask = useMaskInputAntd({ mask: 'decimal' })
  const integerMask = useMaskInputAntd({ mask: 'integer' })
  const percentageMask = useMaskInputAntd({ mask: 'percentage' })

  // Network masks
  const ipMask = useMaskInputAntd({ mask: 'ip' })
  const macMask = useMaskInputAntd({ mask: 'mac' })

  // US Social Security Number
  const ssnMask = useMaskInputAntd({ mask: 'ssn' })

  // Custom phone masks
  const phoneBRMask = useMaskInputAntd({ mask: '(99) 99999-9999' })
  const phoneUSMask = useMaskInputAntd({ mask: '+1 (999) 999-9999' })

  const watched = Form.useWatch([], form)

  const onFinish = (values: Record<string, unknown>) => {
    console.log('Form values:', values)
  }

  return (
    <div style={{ maxWidth: 800, margin: '24px auto', padding: '0 24px' }}>
      <Typography.Title level={2}>
        useMaskInput API Test Suite
      </Typography.Title>

      <Typography.Paragraph type="secondary">
        Complete demonstration of all mask aliases available in the use-mask-input library.
        Test each input to see how masks behave with real-time validation and formatting.
      </Typography.Paragraph>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* Brazilian Documents Section */}
        <Divider>Brazilian Documents</Divider>

        <Space direction="horizontal" size="large" style={{ width: '100%' }}>
          <Form.Item 
            name="cpf" 
            label="CPF (Tax ID)" 
            style={{ flex: 1 }}
            tooltip="Brazilian individual taxpayer registry"
          >
            <Input ref={cpfMask} placeholder="___.___.___-__" />
          </Form.Item>

          <Form.Item 
            name="cnpj" 
            label="CNPJ (Company Tax ID)" 
            style={{ flex: 1 }}
            tooltip="Brazilian company taxpayer registry"
          >
            <Input ref={cnpjMask} placeholder="__.___.___/____-__" />
          </Form.Item>
        </Space>

        {/* Banking Section */}
        <Divider>Banking Information</Divider>

        <Space direction="horizontal" size="large" style={{ width: '100%' }}>
          <Form.Item 
            name="bankAgency" 
            label="Bank Agency" 
            style={{ flex: 1 }}
            tooltip="Brazilian bank agency number"
          >
            <Input ref={bankAgencyMask} placeholder="1234-5" />
          </Form.Item>

          <Form.Item 
            name="bankAccount" 
            label="Bank Account" 
            style={{ flex: 1 }}
            tooltip="Brazilian bank account number (multiple formats supported)"
          >
            <Input ref={bankAccountMask} placeholder="12345678-9" />
          </Form.Item>
        </Space>

        {/* Currency Section */}
        <Divider>Currency</Divider>

        <Space direction="horizontal" size="large" style={{ width: '100%' }}>
          <Form.Item 
            name="currency" 
            label="Currency (USD)" 
            style={{ flex: 1 }}
            tooltip="US Dollar formatting"
          >
            <Input ref={currencyMask} placeholder="$ 0.00" />
          </Form.Item>

          <Form.Item 
            name="brlCurrency" 
            label="Currency (BRL)" 
            style={{ flex: 1 }}
            tooltip="Brazilian Real formatting"
          >
            <Input ref={brlCurrencyMask} placeholder="R$ 0,00" />
          </Form.Item>
        </Space>

        {/* Numeric Section */}
        <Divider>Numeric Values</Divider>

        {/* Numeric Section */}
        <Divider>Numeric Values</Divider>

        <Space direction="horizontal" size="large" style={{ width: '100%', flexWrap: 'wrap' }}>
          <Form.Item 
            name="numeric" 
            label="Numeric" 
            style={{ flex: '1 1 200px' }}
            tooltip="Any numeric input"
          >
            <Input ref={numericMask} placeholder="123456" />
          </Form.Item>

          <Form.Item 
            name="decimal" 
            label="Decimal" 
            style={{ flex: '1 1 200px' }}
            tooltip="Decimal numbers with precision"
          >
            <Input ref={decimalMask} placeholder="123.45" />
          </Form.Item>

          <Form.Item 
            name="integer" 
            label="Integer" 
            style={{ flex: '1 1 200px' }}
            tooltip="Whole numbers only"
          >
            <Input ref={integerMask} placeholder="123" />
          </Form.Item>

          <Form.Item 
            name="percentage" 
            label="Percentage" 
            style={{ flex: '1 1 200px' }}
            tooltip="Percentage values"
          >
            <Input ref={percentageMask} placeholder="0 %" />
          </Form.Item>
        </Space>

        {/* Date and Time Section */}
        <Divider>Date & Time</Divider>

        <Form.Item 
          name="datetime" 
          label="Date/Time"
          tooltip="Date and time formatting"
        >
          <Input ref={datetimeMask} placeholder="dd/mm/yyyy hh:mm" />
        </Form.Item>

        {/* Communication Section */}
        <Divider>Communication</Divider>

        <Form.Item 
          name="email" 
          label="Email"
          tooltip="Email address validation"
        >
          <Input ref={emailMask} placeholder="user@example.com" />
        </Form.Item>

        <Form.Item 
          name="url" 
          label="URL"
          tooltip="Website URL formatting"
        >
          <Input ref={urlMask} placeholder="https://" />
        </Form.Item>

        <Space direction="horizontal" size="large" style={{ width: '100%' }}>
          <Form.Item 
            name="phoneBR" 
            label="Phone (Brazil)" 
            style={{ flex: 1 }}
            tooltip="Brazilian phone number format"
          >
            <Input ref={phoneBRMask} placeholder="(99) 99999-9999" />
          </Form.Item>

          <Form.Item 
            name="phoneUS" 
            label="Phone (USA)" 
            style={{ flex: 1 }}
            tooltip="US phone number format"
          >
            <Input ref={phoneUSMask} placeholder="+1 (999) 999-9999" />
          </Form.Item>
        </Space>

        {/* Network Section */}
        <Divider>Network</Divider>

        <Space direction="horizontal" size="large" style={{ width: '100%' }}>
          <Form.Item 
            name="ip" 
            label="IP Address" 
            style={{ flex: 1 }}
            tooltip="IPv4 address format"
          >
            <Input ref={ipMask} placeholder="192.168.0.1" />
          </Form.Item>

          <Form.Item 
            name="mac" 
            label="MAC Address" 
            style={{ flex: 1 }}
            tooltip="Network MAC address format"
          >
            <Input ref={macMask} placeholder="00:00:00:00:00:00" />
          </Form.Item>
        </Space>

        {/* Other Section */}
        <Divider>Other</Divider>

        <Form.Item 
          name="ssn" 
          label="SSN (Social Security Number)"
          tooltip="US Social Security Number"
        >
          <Input ref={ssnMask} placeholder="000-00-0000" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
            <Button onClick={() => form.resetFields()}>Reset</Button>
          </Space>
        </Form.Item>
      </Form>

      <Divider />

      <Typography.Title level={4}>Form State (Real-time)</Typography.Title>
      <pre style={{ 
        color: '#000', 
        backgroundColor: '#f5f5f5', 
        padding: 16, 
        borderRadius: 8,
        overflow: 'auto'
      }}>
        {JSON.stringify(watched, null, 2)}
      </pre>
    </div>
  )
}

export default App
