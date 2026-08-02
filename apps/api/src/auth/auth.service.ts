import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    // Validate input
    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    try {
      // Look up user in database
      const user = await this.prisma.user.findFirst({
        where: { email },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          passwordHash: true,
          tenantId: true,
        },
      });

      // Validate user exists and is active
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check tenant license status if not admin
      if (user.role !== 'admin') {
        const license = await this.prisma.license.findFirst({
          where: { tenantId: user.tenantId },
          orderBy: { createdAt: 'desc' }
        });
        if (!license) {
          throw new UnauthorizedException('No terminal license found');
        }
        if (license.status === 'suspended') {
          throw new UnauthorizedException('Terminal license has been suspended by the administrator');
        }
        if (license.status === 'expired' || new Date(license.expiresAt) < new Date()) {
          throw new UnauthorizedException('Terminal license has expired');
        }
        if (license.status !== 'active') {
          throw new UnauthorizedException('Terminal license is inactive');
        }
      }

      // Validate password
      if (!user.passwordHash) {
        throw new UnauthorizedException('User account not properly configured');
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate JWT token
      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          tenantId: user.tenantId,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async loginByLicense(licenseKey: string) {
    if (!licenseKey) {
      throw new UnauthorizedException('License key is required');
    }

    try {
      const license = await this.prisma.license.findUnique({
        where: { id: licenseKey },
        include: { tenant: true }
      });

      if (!license) {
        throw new UnauthorizedException('Invalid license key');
      }

      if (license.status === 'suspended') {
        throw new UnauthorizedException('Terminal license has been suspended by the administrator');
      }
      if (license.status === 'expired' || new Date(license.expiresAt) < new Date()) {
        throw new UnauthorizedException('Terminal license has expired');
      }
      if (license.status !== 'active') {
        throw new UnauthorizedException('Terminal license is inactive');
      }

      const user = await this.prisma.user.findFirst({
        where: { tenantId: license.tenantId, role: 'pharmacist', status: 'active' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          tenantId: true,
        }
      });

      if (!user) {
        throw new UnauthorizedException('No active pharmacist user found for this license');
      }

      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          tenantId: user.tenantId,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('License authentication failed');
    }
  }
}
