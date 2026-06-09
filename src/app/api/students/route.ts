import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let prayersQuery = {};
    if (startDate && endDate) {
      prayersQuery = {
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      };
    }

    const students = await prisma.student.findMany({
      include: {
        prayers: prayersQuery
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, dob } = body;

    if (!fullName || !dob) {
      return NextResponse.json({ error: 'Full name and Date of Birth are required' }, { status: 400 });
    }

    // Check for case-insensitive duplicate
    const existingStudents = await prisma.student.findMany({
      where: { dateOfBirth: dob }
    });
    
    const duplicate = existingStudents.find(s => s.fullName.toLowerCase() === fullName.toLowerCase());
    if (duplicate) {
      return NextResponse.json({ error: 'A student with this name and DOB already exists' }, { status: 400 });
    }

    const newStudent = await prisma.student.create({
      data: {
        fullName,
        dateOfBirth: dob
      }
    });

    return NextResponse.json(newStudent);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A student with this name and DOB already exists' }, { status: 400 });
    }
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
