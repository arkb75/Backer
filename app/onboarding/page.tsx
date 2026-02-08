import OnboardingWizard from "@/components/onboarding/OnboardingWizard"

export default function OnboardingPage() {
    return (
        <div style={{ minHeight: '100vh', background: '#f9fafe', paddingTop: '40px' }}>
            {/* 
         In a real app, we'd wrap this in a protected route check 
         or use middleware to ensure only authenticated users access it.
       */}
            <OnboardingWizard />
        </div>
    )
}
