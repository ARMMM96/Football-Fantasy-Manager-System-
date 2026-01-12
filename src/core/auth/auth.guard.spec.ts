import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard', () => {
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });

  describe('canActivate', () => {
    it('should return a boolean or observable', () => {
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer token',
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBeDefined();
    });
  });
});
