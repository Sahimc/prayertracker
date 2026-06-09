import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isFutureDate, getFormatDate } from '@/lib/dates';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, date, prayerName, status } = body;

    if (!studentId || !date || !prayerName || status === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const todayDateStr = getFormatDate(new Date());
    if (isFutureDate(date, todayDateStr)) {
      return NextResponse.json({ error: 'Cannot log prayers for future dates' }, { status: 400 });
    }

    const validPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    if (!validPrayers.includes(prayerName)) {
      return NextResponse.json({ error: 'Invalid prayer name' }, { status: 400 });
    }

    // Upsert the prayer log
    const prayerLog = await prisma.prayerLog.upsert({
      where: {
        studentId_date: {
          studentId,
          date
        }
      },
      update: {
        [prayerName]: status
      },
      create: {
        studentId,
        date,
        [prayerName]: status
      }
    });

    return NextResponse.json(prayerLog);
  } catch (error) {
    console.error('Error updating prayer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
