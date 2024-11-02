import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import {jwtDecode as jwt_decode} from 'jwt-decode';

const GoogleAuth = () => {
    const handleSuccess = async (response) => {
        try {
        const { id_token } = response;
        const { data } = await axios.post('http://localhost:8080/login', { id_token });
        const { token } = data;
        const user = jwt_decode(token);
        console.log('User Info:', user);
        } catch (error) {
        console.error('Google sign-in error:', error);
        }
    };
    
    return (
        <GoogleLogin
        clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}
        onSuccess={handleSuccess}
        onFailure={console.error}
        render={({ onClick }) => (
            <button onClick={onClick} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Login with Google
            </button>
        )}
        />
    );
}

export default GoogleAuth;