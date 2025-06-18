export const metadata = {
  title: 'AR Demo',
  description: 'React Three Fiber with WebXR',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
