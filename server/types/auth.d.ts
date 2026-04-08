declare module '#auth-utils' {
    interface User {
        id: string
        email: string
        name: string
        role: 'admin' | 'user'
    }

    interface UserSession {
        user?: User
        sessionVersion?: number
    }
}
