import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode } = body;

    if (mode === 'admin') {
      const { username, password } = body;
      // Hardcoded admin per plan
      if (username === 'sahimchowdhury' && password === 'obayd') {
        return NextResponse.json({ success: true, isAdmin: true });
      }
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    } 
    
    if (mode === 'student') {
      const { fullName, dob } = body;
      
      if (!fullName || !dob) {
        return NextResponse.json({ error: 'Full name and Date of Birth are required' }, { status: 400 });
      }

      // Check against DB
      // Fetch by DOB to allow case-insensitive JS comparison on fullName
      const studentsWithDob = await prisma.student.findMany({
        where: { dateOfBirth: dob }
      });
      
      const student = studentsWithDob.find(s => s.fullName.toLowerCase() === fullName.toLowerCase());

      if (!student) {
        return NextResponse.json({ error: 'Student not found. Please ask an admin to create your account.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, studentId: student.id });
    }

    return NextResponse.json({ error: 'Invalid login mode' }, { status: 400 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
