import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    // Make the request to the actual authentication endpoint
    const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(username.trim() + ':' + password).toString('base64')
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: 'Authentication failed' },
        { status: 401 }
      );
    }

    let token = await response.text();
    token = token.trim();
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }

    // Return the original token directly
    return NextResponse.json({ 
      token,
      message: 'Authentication successful' 
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
