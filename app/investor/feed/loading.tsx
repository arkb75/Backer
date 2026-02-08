export default function Loading() {
    return (
        <div style={{
            height: '100vh',
            width: '100%',
            background: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                width: '3rem',
                height: '3rem',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
