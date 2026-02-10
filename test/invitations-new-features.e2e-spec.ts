import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { Types } from 'mongoose';

describe('Invitations E2E - New Features', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Note: In real E2E tests, you would authenticate and get a real token
    // This is a placeholder structure
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /invitations/member/bulk', () => {
    it('should bulk invite members successfully', () => {
      return request(app.getHttpServer())
        .post('/invitations/member/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emails: [
            'bulkuser1@test.com',
            'bulkuser2@test.com',
            'bulkuser3@test.com',
          ],
          role: 'MEMBER',
        })
        .expect(201)
        .then((response) => {
          expect(response.body.successful).toBeDefined();
          expect(response.body.failed).toBeDefined();
          expect(response.body.message).toContain('invitations');
        });
    });

    it('should validate email format in bulk invite', () => {
      return request(app.getHttpServer())
        .post('/invitations/member/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emails: ['invalid-email', 'valid@test.com'],
          role: 'MEMBER',
        })
        .expect(400);
    });

    it('should require at least one email', () => {
      return request(app.getHttpServer())
        .post('/invitations/member/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emails: [],
          role: 'MEMBER',
        })
        .expect(400);
    });

    it('should reject CLIENT role for bulk member invites', () => {
      return request(app.getHttpServer())
        .post('/invitations/member/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emails: ['user@test.com'],
          role: 'CLIENT',
        })
        .expect(400);
    });
  });

  describe('POST /invitations/shareable-link', () => {
    it('should create shareable link with default settings', () => {
      return request(app.getHttpServer())
        .post('/invitations/shareable-link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'MEMBER',
        })
        .expect(201)
        .then((response) => {
          expect(response.body.token).toBeDefined();
          expect(response.body.inviteUrl).toBeDefined();
          expect(response.body.inviteUrl).toContain('join?link=');
          expect(response.body.role).toBe('MEMBER');
          expect(response.body.isActive).toBe(true);
        });
    });

    it('should create shareable link with custom settings', () => {
      return request(app.getHttpServer())
        .post('/invitations/shareable-link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'MEMBER',
          expiresInDays: 14,
          maxUses: 5,
          description: 'Test limited invite',
        })
        .expect(201)
        .then((response) => {
          expect(response.body.maxUses).toBe(5);
          expect(response.body.currentUses).toBe(0);
        });
    });

    it('should validate expiration days range', () => {
      return request(app.getHttpServer())
        .post('/invitations/shareable-link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'MEMBER',
          expiresInDays: 400, // > 365
        })
        .expect(400);
    });

    it('should reject CLIENT role for shareable links', () => {
      return request(app.getHttpServer())
        .post('/invitations/shareable-link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'CLIENT',
        })
        .expect(400);
    });
  });

  describe('GET /invitations/shareable-links', () => {
    it('should list all shareable links for tenant', () => {
      return request(app.getHttpServer())
        .get('/invitations/shareable-links')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
        });
    });
  });

  describe('POST /invitations/shareable-link/accept', () => {
    let shareableToken: string;

    beforeAll(async () => {
      // Create a shareable link for testing
      const response = await request(app.getHttpServer())
        .post('/invitations/shareable-link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'MEMBER',
          maxUses: 1,
        });
      shareableToken = response.body.token;
    });

    it('should accept shareable link and create user', () => {
      return request(app.getHttpServer())
        .post('/invitations/shareable-link/accept')
        .send({
          token: shareableToken,
          email: 'newmember@test.com',
          password: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
        })
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('Successfully joined');
          expect(response.body.userId).toBeDefined();
        });
    });

    it('should reject invalid token', () => {
      return request(app.getHttpServer())
        .post('/invitations/shareable-link/accept')
        .send({
          token: 'invalid-token',
          email: 'test@test.com',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });

    it('should validate password strength', () => {
      return request(app.getHttpServer())
        .post('/invitations/shareable-link/accept')
        .send({
          token: shareableToken,
          email: 'test@test.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });
  });

  describe('DELETE /invitations/shareable-link/:id', () => {
    let linkId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations/shareable-link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'MEMBER',
        });
      linkId = response.body.id;
    });

    it('should deactivate shareable link', () => {
      return request(app.getHttpServer())
        .delete(`/invitations/shareable-link/${linkId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('deactivated successfully');
        });
    });

    it('should return 404 for non-existent link', () => {
      const fakeId = new Types.ObjectId().toString();
      return request(app.getHttpServer())
        .delete(`/invitations/shareable-link/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Integration: Bulk Invite + Shareable Link Flow', () => {
    it('should handle both invitation methods concurrently', async () => {
      // Bulk invite
      const bulkResponse = await request(app.getHttpServer())
        .post('/invitations/member/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emails: ['bulk1@test.com', 'bulk2@test.com'],
          role: 'MEMBER',
        })
        .expect(201);

      expect(bulkResponse.body.successful.length).toBeGreaterThan(0);

      // Create shareable link
      const linkResponse = await request(app.getHttpServer())
        .post('/invitations/shareable-link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'MEMBER',
          maxUses: 3,
        })
        .expect(201);

      expect(linkResponse.body.inviteUrl).toBeDefined();

      // List all shareable links
      const listResponse = await request(app.getHttpServer())
        .get('/invitations/shareable-links')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.length).toBeGreaterThan(0);
    });
  });
});
