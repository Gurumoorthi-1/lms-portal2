import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AssessmentStage } from './progress.schema';

export const REQUIRE_STAGE_KEY = 'requireStage';
export const RequireStage = (stage: AssessmentStage) => SetMetadata(REQUIRE_STAGE_KEY, stage);

@Injectable()
export class ProgressGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredStage = this.reflector.getAllAndOverride<AssessmentStage>(REQUIRE_STAGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredStage) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // Check if currentStage in JWT matches the required stage
    // Note: The user object comes from the JwtStrategy
    if (!user || user.currentStage !== requiredStage) {
      throw new ForbiddenException(`This action requires being in the ${requiredStage} stage. Your current stage is ${user?.currentStage || 'Unknown'}.`);
    }

    return true;
  }
}
