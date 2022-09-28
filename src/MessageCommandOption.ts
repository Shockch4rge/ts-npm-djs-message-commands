import { MessageMentions, Snowflake } from "discord.js";

export interface MessageCommandOptionData {
	name: string;
	description: string;
	readonly type: MessageCommandOptionType;
	readonly regexString: string;
}

/**
 * A composable option/argument to add to a message command.
 * @abstract
 */
export abstract class MessageCommandOption {
	/**
	 * The name of the option.
	 */
	public name: string;
	/**
	 * The description of the option.
	 */
	public description: string;
	/**
	 * The type of the option.
	 */
	public readonly type: MessageCommandOptionType;

	public readonly regexString: string;

	public constructor(data: Pick<MessageCommandOptionData, "type" | "regexString">) {
		this.name = "No name implemented";
		this.description = "No description implemented";
		this.type = data.type;
		this.regexString = data.regexString;
	}

	/**
	 * Builds the option in regex form.
	 */
	public abstract buildRegexString(): string;

	/**
	 * Sets the name of the option. Cannot be empty.
	 * @param name The name of the option.
	 * @returns The option instance.
	 */
	public setName(name: string) {
		if (name === "") {
			throw new Error("Option name must be at least one character long.");
		}

		this.name = name;
		return this;
	}

	/**
	 * Sets the name of the option. Cannot be empty.
	 * @param description The description of the option.
	 * @returns The option instance.
	 */
	public setDescription(description: string) {
		if (description === "") {
			throw new Error("Option description must be at least one character long.");
		}

		this.description = description;
		return this;
	}

	/**
	 * Performs a type-specific validation on the option.
	 * @param option The option to compare to.
	 */
	public abstract validate(option: string): unknown;
}

/**
 * A option that can be supplied with pre-defined values for the user to choose from.
 * @abstract
 * @extends MessageCommandOption
 */
export abstract class MessageCommandOptionChoiceable<T extends string | number> extends MessageCommandOption {
	/**
	 * The available pre-determined choices for this option.
	 */
	public choices: MessageCommandOptionChoice<T>[];

	public constructor(type: Pick<MessageCommandOptionData, "type" | "regexString">) {
		super(type);
		this.choices = [];
	}

	public buildRegexString() {
		if (this.choices.length) {
			return `\"(${this.choices.map(c => c[1]).join("|")})\"`
		}

		return this.regexString;
	}

	/**
	 * Add a choice for this option. Chain this multiple times to add more options OR use {@link MessageCommandOptionChoiceable.setChoices}.
	 * @param choice The choice to add.
	 * @returns The option instance.
	 */
	public addChoice(...choice: MessageCommandOptionChoice<T>) {
		if (!choice.length) {
			throw new Error("There must be at least one choice provided in the array.");
		}

		if (choice.every(c => !c)) {
			throw new Error("You must provide a name and value for the option choice.");
		}

		if (!choice[0]) {
			throw new Error("You must provide a name for the option choice.");
		}

		if (!choice[1]) {
			throw new Error("You must provide a value for the option choice.");
		}

		this.choices.push(choice);
		return this;
	}

	/**
	 * Add multiple choices for this option. Use this either once OR chain {@link MessageCommandOptionChoiceable.addChoice}.
	 * @param choices The choices to add.
	 * @returns	The option instance.
	 */
	public setChoices(choices: MessageCommandOptionChoice<T>[]) {
		if (!choices.length) {
			throw new Error("You must provide at least one choice.");
		}

		for (const choice of choices) {
			if (choice.some(c => !c)) {
				throw new Error("You must provide a name and value for every option choice.");
			}
		}

		this.choices = choices;
		return this;
	}
}

/**
 * A string option. Allows choices.
 * @extends MessageCommandOptionChoiceable
 */
export class MessageCommandStringOption extends MessageCommandOptionChoiceable<string> {
	public constructor() {
		super({
			type: MessageCommandOptionType.String,
			regexString: `\"(.+)\"`
		});
	}

	public override validate(option: string): string | undefined {
		for (const choice of this.choices) {
			if (choice[1] === option) {
				return choice[1];
			}
		}

		const matches = option.matchAll(/^"(.+)"$/gi).next().value;
		return matches ? matches[1] : undefined;
	}
}

/**
 * A number option. Allows choices.
 * @extends MessageCommandOptionChoiceable
 */
export class MessageCommandNumberOption extends MessageCommandOptionChoiceable<number> {
	public constructor() {
		super({
			type: MessageCommandOptionType.Number,
			regexString: `(\\d+)`
		});
	}

	public override validate(option: string) {
		const number = Number.parseInt(option);
		return Number.isNaN(number) ? undefined : number;
	}
}

/**
 * A boolean option.
 * @extends MessageCommandOption
 */
export class MessageCommandBooleanOption extends MessageCommandOption {
	public constructor() {
		super({
			type: MessageCommandOptionType.Boolean,
			regexString: `(true|false)`,
		});
	}

	public buildRegexString() {
		return this.regexString;
	}

	public override validate(option: string): boolean | undefined {
		const matches = option.match(/^(true|false)$/g);

		if (matches) {
			if (matches[0] === "true") {
				return true;
			}
			if (matches[0] === "false") {
				return false;
			}
		}

		return undefined;
	}
}

/**
 * A member mentionable option.
 * @extends MessageCommandOption
 */
export class MessageCommandMemberOption extends MessageCommandOption {
	public constructor() {
		super({
			type: MessageCommandOptionType.Member,
			regexString: `<@!?(\\d{17,19})>`
		});
	}

	public buildRegexString() {
		return this.regexString;
	}

	public override validate(option: string): Snowflake | undefined {
		const matches = option.matchAll(MessageMentions.UsersPattern).next().value;
		return matches ? matches[1] : undefined;
	}
}

/**
 * A channel mentionable option.
 * @extends MessageCommandOption
 */
export class MessageCommandChannelOption extends MessageCommandOption {
	public constructor() {
		super({
			type: MessageCommandOptionType.Channel,
			regexString: `<#(\\d{17,19})>`,
		});
	}

	public buildRegexString() {
		return this.regexString;
	}

	public override validate(option: string): Snowflake | undefined {
		const matches = option.matchAll(MessageMentions.ChannelsPattern).next().value;
		return matches ? matches[1] : undefined;
	}
}

/**
 * A role mentionable option.
 * @extends MessageCommandOption
 */
export class MessageCommandRoleOption extends MessageCommandOption {
	public constructor() {
		super({
			type: MessageCommandOptionType.Role,
			regexString: `<@&(\\d{17,19})>`,
		});
	}
	
	public buildRegexString() {
		return this.regexString;
	}

	public override validate(option: string): Snowflake | undefined {
		const matches = option.matchAll(MessageMentions.RolesPattern).next().value;
		return matches ? matches[1] : undefined;
	}
}

/**
 * An enum containing user-friendly values for each option type.
 */
export enum MessageCommandOptionType {
	Boolean = "Boolean",
	Number = "Number",
	String = "String",
	Member = "Member",
	Channel = "Channel",
	Role = "Role",
}

/**
 * A tuple containing both the name and value for each option choice.
 */
export type MessageCommandOptionChoice<ValueType extends string | number> = [name: string, value: ValueType];

export interface MessageCommandOptionError {
	message: string;
	type: keyof typeof MessageCommandOptionErrors;
}

export const MessageCommandOptionErrors = {
	InvalidArgType: "InvalidArgType",
	MissingArgs: "MissingArgs",
	MissingPermissions: "MissingPermissions",
	MissionRoles: "MissingRoles",
} as const;
