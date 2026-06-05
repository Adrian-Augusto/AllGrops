"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const google_auth_guard_1 = require("./google-auth.guard");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const class_validator_1 = require("class-validator");
class RegisterDto {
    name;
    email;
    // Note: @IsStrongPassword would require special chars, upper, lower, numbers
    // For production, uncomment the line below for stronger passwords
    // @IsStrongPassword()
    password;
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2, { message: 'Name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Name must not exceed 100 characters' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Invalid email format' }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password must not exceed 128 characters' })
    // Note: @IsStrongPassword would require special chars, upper, lower, numbers
    // For production, uncomment the line below for stronger passwords
    // @IsStrongPassword()
    ,
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
class LoginDto {
    email;
    password;
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Invalid email format' }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class ChangePasswordDto {
    currentPassword;
    newPassword;
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8, { message: 'New password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password must not exceed 128 characters' }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
let AuthController = AuthController_1 = class AuthController {
    authService;
    configService;
    logger = new common_1.Logger(AuthController_1.name);
    constructor(authService, configService) {
        this.authService = authService;
        this.configService = configService;
    }
    async register(body) {
        // Body validation is handled by ValidationPipe
        return this.authService.register(body.name, body.email, body.password);
    }
    async login(body, res) {
        // Body validation is handled by ValidationPipe
        if (!body.email || !body.password) {
            return res.status(400).json({
                statusCode: 400,
                message: 'Email and password are required',
            });
        }
        const result = await this.authService.login(body.email, body.password);
        // Set HttpOnly cookie with secure flag
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true, // Prevents XSS attacks
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site cookies in production
            maxAge: 3600000, // 1 hour
            path: '/',
        });
        return res.json(result);
    }
    googleLogin() {
        // Este endpoint inicia o fluxo OAuth do Google
        // O GoogleAuthGuard redireciona para https://accounts.google.com/o/oauth2/v2/auth
    }
    async googleCallback(req, res, code, error, state) {
        // Definir fallback seguro para a URL de produção
        const fallbackUrl = this.configService.get('FRONTEND_URL') || 'https://front-end-flow-group.vercel.app';
        let targetRedirectUrl = `${fallbackUrl}/auth/callback`;
        try {
            // Tratamento de erros do Google OAuth
            if (error) {
                this.logger.warn(`Google OAuth error: ${error}`);
                return res.redirect(`${fallbackUrl}/login?error=${error}`);
            }
            if (!code && !req.user) {
                throw new common_1.BadRequestException('Authorization code or user not provided');
            }
            // Após o GoogleAuthGuard, o Passport já trocou o código por access_token
            // e executou a validação, deixando o usuário em req.user
            const userProfile = req.user;
            if (!userProfile) {
                throw new common_1.BadRequestException('Failed to retrieve user profile from Google');
            }
            // Criar ou atualizar usuário no banco de dados
            const result = await this.authService.googleLogin(userProfile);
            // Validação rigorosa do parâmetro state para evitar vulnerabilidade de Open Redirect
            if (state && typeof state === 'string' && state.length < 2048) {
                try {
                    const parsed = JSON.parse(state);
                    if (parsed && typeof parsed.r === 'string') {
                        const parsedUrl = new URL(parsed.r);
                        // 1. Protocolo estritamente http ou https (evita javascript:, etc.)
                        const hasSafeProtocol = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
                        // 2. Hostname estritamente na whitelist ou correspondente ao padrão da Vercel
                        const isWhitelisted = [
                            'localhost',
                            '127.0.0.1',
                            'front-end-flow-group.vercel.app'
                        ].some(domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain));
                        const isVercelPreview = /^front-end-flow-group(-[a-z0-9]+)*(-adrian-augustos-projects)?\.vercel\.app$/.test(parsedUrl.hostname);
                        if (hasSafeProtocol && (isWhitelisted || isVercelPreview)) {
                            // Se passar em todas as validações, reconstrói o path final de callback do frontend com a origem validada
                            targetRedirectUrl = `${parsedUrl.origin}/auth/callback`;
                        }
                        else {
                            this.logger.warn(`Open Redirect detectado e bloqueado para a URL: ${parsed.r}`);
                        }
                    }
                }
                catch (e) {
                    const errorMsg = e instanceof Error ? e.message : String(e);
                    this.logger.warn(`Falha ao ler parâmetro state do OAuth: ${errorMsg}`);
                }
            }
            // Retornar o token JWT diretamente na URL para o frontend armazenar
            // O token será salvo em sessionStorage pelo frontend
            const token = result.accessToken;
            // Set HttpOnly cookie (para requisições que não enviam Bearer token)
            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 3600000, // 1 hora
                path: '/',
            });
            // Redirecionar para o frontend com o token na URL
            return res.redirect(`${targetRedirectUrl}?token=${token}`);
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Google OAuth callback error: ${errorMsg}`, error instanceof Error ? error.stack : '');
            return res.redirect(`${fallbackUrl}/login?error=auth_failed`);
        }
    }
    async exchangeCode(code, res) {
        if (!code) {
            throw new common_1.BadRequestException('Código de autorização é obrigatório');
        }
        // Valida e consome o código temporário
        const result = this.authService.exchangeTempCode(code);
        // Salva o token em cookie HttpOnly para compatibilidade/backup
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 3600000, // 1 hora
            path: '/',
        });
        return res.json(result);
    }
    async getGoogleProfile(req) {
        if (req.user) {
            // Extrai o token do header de autorização ou do cookie de forma segura
            const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;
            return {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role,
                token: token || null,
            };
        }
        return null;
    }
    async logout(res) {
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
        });
        return res.json({ message: 'Logged out successfully' });
    }
    async changePassword(req, body) {
        return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('google'),
    (0, common_1.UseGuards)(google_auth_guard_1.GoogleAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "googleLogin", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    (0, common_1.UseGuards)(google_auth_guard_1.GoogleAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('code')),
    __param(3, (0, common_1.Query)('error')),
    __param(4, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.Post)('exchange-code'),
    __param(0, (0, common_1.Body)('code')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "exchangeCode", null);
__decorate([
    (0, common_1.Get)('google/profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getGoogleProfile", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
