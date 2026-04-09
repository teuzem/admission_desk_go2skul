import { createContext, useContext, useState, ReactNode } from 'react'

interface SignupData {
  // Step 1
  selectedUniversities: string[]
  // Step 2
  firstName: string
  lastName: string
  emailId: string
  mobileNumber: string
  registeredCompanyName: string
  tradingName: string
  companyEmail: string
  officeAddress: string
  officeCountry: string
  officeCity: string
  postalCode: string
  accountType: string
  website: string
  designation: string
  jobRoles: string[]
  recruitmentRegions: string[]
  representsHQ: boolean
  // Step 3
  businessLicenceFile: File | null
  companyRegistrationNumber: string
  incorporationDate: string
  expiryDate: string
  doesNotExpire: boolean
  sameAddress: boolean
  registeredAddress: string
  registeredCity: string
  registeredCountry: string
  registeredPostalCode: string
  isAddressSameAsOffice: boolean
  acceptedTerms: boolean
}

const defaultSignupData: SignupData = {
  selectedUniversities: [],
  firstName: '',
  lastName: '',
  emailId: '',
  mobileNumber: '',
  registeredCompanyName: '',
  tradingName: '',
  companyEmail: '',
  officeAddress: '',
  officeCountry: '',
  officeCity: '',
  postalCode: '',
  accountType: '',
  website: '',
  designation: '',
  jobRoles: [],
  recruitmentRegions: [],
  representsHQ: true,
  businessLicenceFile: null,
  companyRegistrationNumber: '',
  incorporationDate: '',
  expiryDate: '',
  doesNotExpire: false,
  sameAddress: true,
  registeredAddress: '',
  registeredCity: '',
  registeredCountry: '',
  registeredPostalCode: '',
  isAddressSameAsOffice: true,
  acceptedTerms: false,
}

interface SignupContextValue {
  data: SignupData
  updateData: (updates: Partial<SignupData>) => void
  currentStep: number
  setCurrentStep: (step: number) => void
  resetSignup: () => void
}

const SignupContext = createContext<SignupContextValue | undefined>(undefined)

export function SignupProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SignupData>(defaultSignupData)
  const [currentStep, setCurrentStep] = useState(1)

  const updateData = (updates: Partial<SignupData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const resetSignup = () => {
    setData(defaultSignupData)
    setCurrentStep(1)
  }

  return (
    <SignupContext.Provider value={{ data, updateData, currentStep, setCurrentStep, resetSignup }}>
      {children}
    </SignupContext.Provider>
  )
}

export function useSignup() {
  const context = useContext(SignupContext)
  if (!context) throw new Error('useSignup must be used within SignupProvider')
  return context
}
